import type { SupabaseClient } from '@supabase/supabase-js';
import { looksPortuguese, slugify, stripHtml, stripPromo, truncate } from '@/lib/utils/text';
import { loadCoverPool, pickCover } from './covers-pool';
import type { EditorialServices } from './index';
import type { GeneratedArticle, SourceContext } from './generator';

export interface EditorialStats {
  generated: number;
  published: number;
  heldNotPt: number;
  failed: number;
}

interface MemberRow {
  is_primary_source: boolean;
  raw_articles: {
    original_title: string;
    original_description: string | null;
    original_content: string | null;
    url: string;
    image_url: string | null;
    published_at: string | null;
    language: string | null;
    sources: { name: string; is_primary_source: boolean; reliability_level: number };
  };
}

interface Built {
  sources: SourceContext[];
  image: string | null;
  firstPublishedAt: string;
}

async function buildContext(db: SupabaseClient, eventId: string): Promise<Built> {
  const mem = await db
    .from('event_sources')
    .select('is_primary_source, raw_articles(original_title, original_description, original_content, url, image_url, published_at, language, sources(name, is_primary_source, reliability_level))')
    .eq('event_id', eventId);
  if (mem.error) throw mem.error;
  const members = (mem.data as unknown as MemberRow[]).sort(
    (a, b) =>
      Number(b.is_primary_source) - Number(a.is_primary_source) ||
      b.raw_articles.sources.reliability_level - a.raw_articles.sources.reliability_level ||
      (a.raw_articles.published_at ?? '').localeCompare(b.raw_articles.published_at ?? ''),
  );
  const sources: SourceContext[] = members.map((m) => {
    const r = m.raw_articles;
    // Trecho do texto original (sem HTML e sem propaganda) para o redator ter fatos além do resumo.
    const excerpt = truncate(stripPromo(stripHtml(r.original_content ?? '')), 1800) || null;
    return {
      name: r.sources.name,
      url: r.url,
      title: r.original_title,
      description: r.original_description ? stripPromo(r.original_description) || null : null,
      excerpt,
      language: r.language,
      isPrimary: m.is_primary_source,
      publishedAt: r.published_at,
    };
  });
  const times = members.map((m) => m.raw_articles.published_at).filter((v): v is string => !!v).sort();
  return {
    sources,
    image: members.find((m) => m.raw_articles.image_url)?.raw_articles.image_url ?? null,
    firstPublishedAt: new Date(Math.min(Date.now(), new Date(times[0] ?? Date.now()).getTime())).toISOString(),
  };
}

const isPt = (g: GeneratedArticle) => looksPortuguese(`${g.title} ${g.summary} ${g.content}`);

/** Decide o status final. Regra do portal: só publica/manda para revisão o que está em pt-BR; o resto fica em rascunho. */
function pickStatus(g: GeneratedArticle, autoPublish: boolean): 'draft' | 'review' | 'published' | 'archived' {
  if (g.relevant === false) return 'archived'; // propaganda / fora do tema
  if (!isPt(g)) return 'draft';
  return autoPublish ? 'published' : 'review';
}

/**
 * Cria artigos para eventos sem artigo. Com `improve`, também refaz artigos gerados pelo gerador básico
 * (traduzindo/reescrevendo em pt-BR quando há LLM configurado).
 */
export async function generateArticles(
  db: SupabaseClient,
  svc: EditorialServices,
  opts: { limit?: number; autoPublish?: boolean; improve?: boolean; redo?: boolean } = {},
): Promise<EditorialStats> {
  const stats: EditorialStats = { generated: 0, published: 0, heldNotPt: 0, failed: 0 };
  const autoPublish = opts.autoPublish ?? process.env.EDITORIAL_AUTO_PUBLISH === 'true';
  const limit = opts.limit ?? 50;
  const cats = await db.from('categories').select('id, slug, name');
  const catId = new Map((cats.data ?? []).map((c) => [c.slug as string, c.id as string]));
  const catSlugById = new Map((cats.data ?? []).map((c) => [c.id as string, c.slug as string]));
  // Capas: pool de imagens por categoria (npm run covers:seed), sem custo por matéria. Ver src/editorial/covers-pool.ts.
  const coverPool = await loadCoverPool(db);
  if (!coverPool.size) console.log('editorial: pool de capas vazio — rode "npm run covers:seed". Matérias ficam sem capa até lá.');

  // 1) Eventos novos (sem artigo).
  const events = await db.from('news_events').select('id, title, category_id').eq('status', 'active').order('last_updated_at', { ascending: false }).limit(300);
  if (events.error) throw events.error;
  const existing = await db.from('articles').select('event_id').in('event_id', events.data.map((e) => e.id));
  if (existing.error) throw existing.error;
  const have = new Set(existing.data.map((a) => a.event_id));
  const created = events.data.filter((e) => !have.has(e.id)).slice(0, limit);

  for (const ev of created) {
    try {
      const ctx = await buildContext(db, ev.id);
      const gen = await svc.generator.generate({ title: ctx.sources[0]?.title ?? ev.title, sources: ctx.sources });
      const status = pickStatus(gen, autoPublish);
      const categoryId = (gen.categorySlug && catId.get(gen.categorySlug)) || ev.category_id;
      const slug = `${slugify(gen.title, 70)}-${ev.id.slice(0, 6)}`;
      const featuredImage = pickCover(coverPool, catSlugById.get(categoryId ?? '') ?? null, slug);
      const inserted = await db.from('articles').insert({
        event_id: ev.id,
        title: gen.title,
        subtitle: gen.subtitle,
        slug,
        summary: gen.summary,
        content: gen.content,
        featured_image: featuredImage,
        category_id: categoryId,
        status,
        seo_title: gen.seoTitle,
        seo_description: gen.seoDescription,
        generated_by: gen.generatedBy,
        published_at: status === 'published' ? ctx.firstPublishedAt : null,
      }).select('id').single();
      if (inserted.error) throw inserted.error;
      stats.generated++;
      if (status === 'published') stats.published++;
      if (!isPt(gen)) stats.heldNotPt++;
    } catch (e) {
      stats.failed++;
      console.error(`editorial: falha no evento ${ev.id}:`, e instanceof Error ? e.message : e);
    }
  }

  // 2) Melhorar artigos existentes do gerador básico (só faz sentido com LLM).
  if (opts.improve && svc.provider.name !== 'none') {
    let q = db
      .from('articles')
      .select('id, event_id, status, title, slug, category_id, featured_image')
      .not('event_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(opts.redo ? 500 : limit);
    q = opts.redo ? q.neq('generated_by', 'human') : q.eq('generated_by', 'basic');
    const old = await q;
    if (old.error) throw old.error;

    for (const art of old.data) {
      try {
        const ctx = await buildContext(db, art.event_id);
        const gen = await svc.generator.generate({ title: ctx.sources[0]?.title ?? art.title, sources: ctx.sources });
        if (gen.generatedBy === 'basic') { stats.failed++; continue; } // LLM falhou: mantém como está
        const ok = isPt(gen);
        // Já publicado continua publicado (se agora está em pt-BR); rascunho vira revisão/publicado conforme a regra.
        const status = gen.relevant === false ? 'archived' : !ok ? 'draft' : art.status === 'published' ? 'published' : autoPublish ? 'published' : 'review';
        const categoryId = (gen.categorySlug && catId.get(gen.categorySlug)) || art.category_id;
        const patch: Record<string, unknown> = {
          title: gen.title,
          subtitle: gen.subtitle,
          summary: gen.summary,
          content: gen.content,
          seo_title: gen.seoTitle,
          seo_description: gen.seoDescription,
          generated_by: gen.generatedBy,
          category_id: categoryId,
          status,
          published_at: status === 'published' ? ctx.firstPublishedAt : null,
        };
        if (!art.featured_image) {
          patch.featured_image = pickCover(coverPool, catSlugById.get(categoryId ?? '') ?? null, art.slug);
        }
        const { error } = await db.from('articles').update(patch).eq('id', art.id);
        if (error) throw error;
        stats.generated++;
        if (status === 'published') stats.published++;
      } catch (e) {
        stats.failed++;
        console.error(`editorial: falha ao melhorar artigo ${art.id}:`, e instanceof Error ? e.message : e);
      }
    }
  }
  return stats;
}
