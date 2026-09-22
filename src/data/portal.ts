import { getPublicClient } from '@/lib/supabase/clients';
import type { CategoryRow, CompanyRow, ModelRow } from '@/domain/types';

/**
 * Camada de leitura do portal público. Usa o cliente anon (RLS): só enxerga artigos publicados.
 * Se o Supabase não estiver configurado devolve listas vazias (o portal mostra estado vazio).
 */
export interface CardArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  featured_image: string | null;
  published_at: string | null;
  category: { name: string; slug: string } | null;
  source: string | null;
  /** Todas as fontes do evento (primárias primeiro). */
  sources: { name: string; isPrimary: boolean }[];
  eventId: string | null;
  trend: number;
  importance: number;
}

export interface ArticleSource {
  source_name: string;
  source_website: string | null;
  is_primary_source: boolean;
  original_title: string;
  url: string;
  published_at: string | null;
}

export interface ArticleDetail extends CardArticle {
  subtitle: string | null;
  content: string | null;
  updated_at: string;
  seo_title: string | null;
  seo_description: string | null;
  generated_by: string;
  companies: CompanyRow[];
  models: ModelRow[];
  sourceLinks: ArticleSource[];
}

const CARD_SELECT =
  'id, slug, title, summary, featured_image, published_at, event_id, categories(name, slug), news_events(trend_score, importance_score)';

type Row = Record<string, any>;
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

async function attachSources(rows: Row[]): Promise<CardArticle[]> {
  const db = getPublicClient();
  const byArticle = new Map<string, { name: string; isPrimary: boolean }[]>();
  if (db && rows.length) {
    const { data } = await db
      .from('article_sources')
      .select('article_id, source_name, is_primary_source')
      .in('article_id', rows.map((r) => r.id));
    for (const s of (data ?? []).sort((a, b) => Number(b.is_primary_source) - Number(a.is_primary_source))) {
      const list = byArticle.get(s.article_id) ?? [];
      if (!list.some((x) => x.name === s.source_name)) list.push({ name: s.source_name, isPrimary: s.is_primary_source });
      byArticle.set(s.article_id, list);
    }
  }
  return rows.map((r) => {
    const ev = one<Row>(r.news_events);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      featured_image: r.featured_image,
      published_at: r.published_at,
      category: one(r.categories),
      source: byArticle.get(r.id)?.[0]?.name ?? null,
      sources: byArticle.get(r.id) ?? [],
      eventId: r.event_id ?? null,
      trend: ev?.trend_score ?? 0,
      importance: ev?.importance_score ?? 0,
    };
  });
}

const sanitize = (q: string) => q.replace(/[%_,()\\]/g, ' ').trim().slice(0, 80);

export async function getCategories(): Promise<CategoryRow[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db.from('categories').select('*').order('sort_order');
  return (data ?? []) as CategoryRow[];
}

export async function getCategory(slug: string): Promise<CategoryRow | null> {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db.from('categories').select('*').eq('slug', slug).maybeSingle();
  return (data as CategoryRow | null) ?? null;
}

export async function getFeed(opts: { limit?: number; offset?: number; categoryId?: string; eventIds?: string[] } = {}): Promise<CardArticle[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { limit = 20, offset = 0, categoryId, eventIds } = opts;
  if (eventIds && !eventIds.length) return [];
  let q = db.from('articles').select(CARD_SELECT).eq('status', 'published').order('published_at', { ascending: false }).range(offset, offset + limit - 1);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (eventIds) q = q.in('event_id', eventIds);
  const { data } = await q;
  return attachSources((data ?? []) as Row[]);
}

/** Eventos com mais atividade recente que já têm artigo publicado. */
export async function getTrending(limit = 5): Promise<CardArticle[]> {
  const db = getPublicClient();
  if (!db) return [];
  const since = new Date(Date.now() - 72 * 3_600_000).toISOString();
  const { data } = await db
    .from('articles')
    .select(CARD_SELECT)
    .eq('status', 'published')
    .gte('published_at', since)
    .limit(60);
  const cards = await attachSources((data ?? []) as Row[]);
  return cards.sort((a, b) => b.trend - a.trend).slice(0, limit);
}

export async function getArticle(slug: string): Promise<ArticleDetail | null> {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db
    .from('articles')
    .select(`${CARD_SELECT}, subtitle, content, updated_at, seo_title, seo_description, generated_by`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!data) return null;
  const [card] = await attachSources([data as Row]);
  const row = data as Row;

  const [src, comp, mod] = await Promise.all([
    db.from('article_sources').select('source_name, source_website, is_primary_source, original_title, url, published_at').eq('article_id', row.id).order('is_primary_source', { ascending: false }).order('published_at'),
    row.event_id ? db.from('event_companies').select('companies(*)').eq('event_id', row.event_id) : Promise.resolve({ data: [] }),
    row.event_id ? db.from('event_models').select('models(*)').eq('event_id', row.event_id) : Promise.resolve({ data: [] }),
  ]);
  return {
    ...card,
    subtitle: row.subtitle,
    content: row.content,
    updated_at: row.updated_at,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    generated_by: row.generated_by,
    sourceLinks: (src.data ?? []) as ArticleSource[],
    companies: ((comp.data ?? []) as Row[]).map((r) => one<CompanyRow>(r.companies)).filter((c): c is CompanyRow => !!c),
    models: ((mod.data ?? []) as Row[]).map((r) => one<ModelRow>(r.models)).filter((m): m is ModelRow => !!m),
  };
}

export async function getRelated(article: ArticleDetail, limit = 4): Promise<CardArticle[]> {
  const db = getPublicClient();
  if (!db || !article.companies.length) return [];
  const { data } = await db.from('event_companies').select('event_id').in('company_id', article.companies.map((c) => c.id)).limit(60);
  const ids = [...new Set((data ?? []).map((r) => r.event_id as string))].filter((id) => id !== article.eventId);
  const feed = await getFeed({ limit: limit + 1, eventIds: ids });
  return feed.filter((a) => a.id !== article.id).slice(0, limit);
}

export async function getCompanies(): Promise<CompanyRow[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db.from('companies').select('*').order('name');
  return (data ?? []) as CompanyRow[];
}

export async function getCompany(slug: string) {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db.from('companies').select('*').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const company = data as CompanyRow;
  const [models, ev] = await Promise.all([
    db.from('models').select('*').eq('company_id', company.id).order('name'),
    db.from('event_companies').select('event_id').eq('company_id', company.id).limit(200),
  ]);
  const news = await getFeed({ limit: 30, eventIds: (ev.data ?? []).map((r) => r.event_id as string) });
  return { company, models: (models.data ?? []) as ModelRow[], news };
}

export async function getModels(): Promise<(ModelRow & { company: CompanyRow | null })[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db.from('models').select('*, companies(*)').order('name');
  return ((data ?? []) as Row[]).map((m) => ({ ...(m as ModelRow), company: one<CompanyRow>(m.companies) }));
}

export async function getModel(slug: string) {
  const db = getPublicClient();
  if (!db) return null;
  const { data } = await db.from('models').select('*, companies(*)').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  const ev = await db.from('event_models').select('event_id').eq('model_id', row.id).limit(200);
  const news = await getFeed({ limit: 30, eventIds: (ev.data ?? []).map((r) => r.event_id as string) });
  return { model: row as ModelRow, company: one<CompanyRow>(row.companies), news };
}

export async function search(query: string) {
  const db = getPublicClient();
  const q = sanitize(query);
  if (!db || q.length < 2) return { articles: [] as CardArticle[], companies: [] as CompanyRow[], models: [] as ModelRow[] };
  const like = `%${q}%`;
  const [a, c, m] = await Promise.all([
    db.from('articles').select(CARD_SELECT).eq('status', 'published').or(`title.ilike.${like},summary.ilike.${like}`).order('published_at', { ascending: false }).limit(30),
    db.from('companies').select('*').ilike('name', like).limit(8),
    db.from('models').select('*').ilike('name', like).limit(8),
  ]);
  return {
    articles: await attachSources((a.data ?? []) as Row[]),
    companies: (c.data ?? []) as CompanyRow[],
    models: (m.data ?? []) as ModelRow[],
  };
}

export async function getSitemapEntries() {
  const db = getPublicClient();
  if (!db) return { articles: [], companies: [], models: [] };
  const [a, c, m] = await Promise.all([
    db.from('articles').select('slug, updated_at').eq('status', 'published').order('published_at', { ascending: false }).limit(5000),
    db.from('companies').select('slug'),
    db.from('models').select('slug'),
  ]);
  return {
    articles: (a.data ?? []) as { slug: string; updated_at: string }[],
    companies: (c.data ?? []) as { slug: string }[],
    models: (m.data ?? []) as { slug: string }[],
  };
}

export interface PublicStats {
  active_sources: number;
  last_checked_at: string | null;
  raw_24h: number;
  events_24h: number;
  published_24h: number;
}

/** Números reais do pipeline (view public_stats). null se a view ainda não existe ou o Supabase não está configurado. */
export async function getPublicStats(): Promise<PublicStats | null> {
  const db = getPublicClient();
  if (!db) return null;
  const { data, error } = await db.from('public_stats').select('*').maybeSingle();
  if (error || !data) return null;
  return data as PublicStats;
}

export interface PublicSource {
  name: string;
  slug: string;
  website_url: string;
  source_type: 'rss' | 'scraper' | 'api';
  is_primary_source: boolean;
  reliability_level: number;
  language: string;
  country: string | null;
  active: boolean;
  last_checked_at: string | null;
}

export async function getPublicSources(): Promise<PublicSource[]> {
  const db = getPublicClient();
  if (!db) return [];
  const { data } = await db.from('public_sources').select('*').order('is_primary_source', { ascending: false }).order('name');
  return (data ?? []) as PublicSource[];
}

/** Matérias publicadas por hora nas últimas `hours` horas (mais antigo primeiro). */
export async function getHourlyCounts(hours = 6): Promise<{ label: string; count: number }[]> {
  const db = getPublicClient();
  const now = Date.now();
  const buckets = Array.from({ length: hours }, (_, i) => ({ start: now - (hours - i) * 3_600_000, count: 0 }));
  if (db) {
    const { data } = await db.from('articles').select('published_at').eq('status', 'published').gte('published_at', new Date(now - hours * 3_600_000).toISOString());
    for (const r of data ?? []) {
      const t = new Date(r.published_at as string).getTime();
      const b = buckets.find((x) => t >= x.start && t < x.start + 3_600_000);
      if (b) b.count++;
    }
  }
  const fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return buckets.map((b) => ({ label: fmt.format(new Date(b.start + 3_600_000)), count: b.count }));
}
