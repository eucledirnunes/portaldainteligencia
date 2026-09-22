import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewsClassifier } from '@/editorial/classifier';
import { slugify } from '@/lib/utils/text';
import { extractEntities, type Entities } from './entities';
import type { EventCandidate, EventMatcher } from './matcher';
import { computeScores, type Member } from './scoring';

interface RawWithSource {
  id: string;
  original_title: string;
  original_description: string | null;
  canonical_url: string;
  published_at: string | null;
  created_at: string;
  sources: { is_primary_source: boolean; reliability_level: number; country: string | null };
}

interface EventState {
  candidate: EventCandidate;
  members: Member[];
  hasPrimary: boolean;
  title: string;
  firstSeen: Date;
  dirty: boolean;
}

export interface ClusterStats {
  processed: number;
  attached: number;
  created: number;
  failed: number;
}

const chunk = <T>(arr: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

const mergeEntities = (a: Entities, b: Entities): Entities => ({
  companies: [...new Set([...a.companies, ...b.companies])],
  models: [...new Set([...a.models, ...b.models])],
  versions: [...new Set([...a.versions, ...b.versions])].slice(0, 12),
});

/**
 * raw_articles(status=new) -> news_events. O algoritmo de similaridade é injetado (EventMatcher):
 * trocar por embeddings não exige mexer neste orquestrador.
 */
export async function clusterNewArticles(
  db: SupabaseClient,
  matcher: EventMatcher,
  classifier: NewsClassifier,
  opts: { limit?: number; windowHours?: number } = {},
): Promise<ClusterStats> {
  const stats: ClusterStats = { processed: 0, attached: 0, created: 0, failed: 0 };
  const windowHours = opts.windowHours ?? 72;

  const news = await db
    .from('raw_articles')
    .select('id, original_title, original_description, canonical_url, published_at, created_at, sources(is_primary_source, reliability_level, country)')
    .eq('status', 'new')
    .order('published_at', { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 500);
  if (news.error) throw news.error;
  const pending = news.data as unknown as RawWithSource[];
  if (!pending.length) return stats;

  const [cats, comps, models] = await Promise.all([
    db.from('categories').select('id, slug'),
    db.from('companies').select('id, slug'),
    db.from('models').select('id, slug'),
  ]);
  const idBySlug = (r: { data: { id: string; slug: string }[] | null }) => new Map((r.data ?? []).map((x) => [x.slug, x.id]));
  const catId = idBySlug(cats);
  const compId = idBySlug(comps);
  const modelId = idBySlug(models);

  // Estado em memória dos eventos recentes (candidatos).
  const cutoff = new Date(Date.now() - windowHours * 3_600_000 * 2).toISOString();
  const evRes = await db.from('news_events').select('id, title, entities, first_seen_at, last_updated_at').eq('status', 'active').gte('last_updated_at', cutoff);
  if (evRes.error) throw evRes.error;
  const states = new Map<string, EventState>();
  for (const e of evRes.data) {
    states.set(e.id, {
      candidate: { id: e.id, titles: [e.title], urls: [], entities: { companies: [], models: [], versions: [], ...(e.entities ?? {}) }, lastUpdatedAt: new Date(e.last_updated_at) },
      members: [],
      hasPrimary: false,
      title: e.title,
      firstSeen: new Date(e.first_seen_at),
      dirty: false,
    });
  }
  for (const ids of chunk([...states.keys()], 100)) {
    const mem = await db
      .from('event_sources')
      .select('event_id, is_primary_source, raw_articles(original_title, canonical_url, published_at, sources(reliability_level))')
      .in('event_id', ids);
    if (mem.error) throw mem.error;
    for (const m of mem.data as unknown as {
      event_id: string;
      is_primary_source: boolean;
      raw_articles: { original_title: string; canonical_url: string; published_at: string | null; sources: { reliability_level: number } };
    }[]) {
      const st = states.get(m.event_id)!;
      st.candidate.titles.push(m.raw_articles.original_title);
      st.candidate.urls.push(m.raw_articles.canonical_url);
      st.hasPrimary ||= m.is_primary_source;
      st.members.push({ reliability: m.raw_articles.sources.reliability_level, isPrimary: m.is_primary_source, publishedAt: new Date(m.raw_articles.published_at ?? Date.now()) });
    }
  }

  const clusteredIds: string[] = [];
  for (const raw of pending) {
    try {
      const publishedAt = new Date(raw.published_at ?? raw.created_at);
      const input = { title: raw.original_title, canonicalUrl: raw.canonical_url, publishedAt };
      const match = await matcher.findMatch(input, [...states.values()].map((s) => s.candidate));
      const cls = await classifier.classify({ title: raw.original_title, description: raw.original_description, sourceCountry: raw.sources.country });
      const entities = extractEntities(raw.original_title);
      const isPrimary = raw.sources.is_primary_source;
      const member: Member = { reliability: raw.sources.reliability_level, isPrimary, publishedAt };

      let eventId: string;
      if (match) {
        eventId = match.eventId;
        const st = states.get(eventId)!;
        const { error } = await db.from('event_sources').insert({ event_id: eventId, raw_article_id: raw.id, relevance_score: Math.round(match.score * 100) / 100, is_primary_source: isPrimary });
        if (error) throw error;
        st.candidate.titles.push(raw.original_title);
        st.candidate.urls.push(raw.canonical_url);
        st.candidate.entities = mergeEntities(st.candidate.entities, entities);
        if (publishedAt > st.candidate.lastUpdatedAt) st.candidate.lastUpdatedAt = publishedAt;
        if (publishedAt < st.firstSeen) st.firstSeen = publishedAt;
        if (isPrimary && !st.hasPrimary) st.title = raw.original_title; // título passa a vir da fonte primária
        st.hasPrimary ||= isPrimary;
        st.members.push(member);
        st.dirty = true;
        stats.attached++;
      } else {
        eventId = randomUUID();
        const { error } = await db.from('news_events').insert({
          id: eventId,
          title: raw.original_title,
          slug: `${slugify(raw.original_title, 60)}-${eventId.slice(0, 6)}`,
          summary: raw.original_description,
          category_id: (cls.categorySlug && catId.get(cls.categorySlug)) || null,
          entities,
          first_seen_at: publishedAt.toISOString(),
          last_updated_at: publishedAt.toISOString(),
        });
        if (error) throw error;
        const link = await db.from('event_sources').insert({ event_id: eventId, raw_article_id: raw.id, relevance_score: 1, is_primary_source: isPrimary });
        if (link.error) throw link.error;
        states.set(eventId, {
          candidate: { id: eventId, titles: [raw.original_title], urls: [raw.canonical_url], entities, lastUpdatedAt: publishedAt },
          members: [member], hasPrimary: isPrimary, title: raw.original_title, firstSeen: publishedAt, dirty: true,
        });
        stats.created++;
      }

      const compRows = cls.companies.map((s) => compId.get(s)).filter(Boolean).map((company_id) => ({ event_id: eventId, company_id }));
      const modelRows = cls.models.map((s) => modelId.get(s)).filter(Boolean).map((model_id) => ({ event_id: eventId, model_id }));
      if (compRows.length) await db.from('event_companies').upsert(compRows, { onConflict: 'event_id,company_id', ignoreDuplicates: true });
      if (modelRows.length) await db.from('event_models').upsert(modelRows, { onConflict: 'event_id,model_id', ignoreDuplicates: true });

      clusteredIds.push(raw.id);
      stats.processed++;
    } catch (e) {
      stats.failed++;
      console.error(`cluster: falha em raw_article ${raw.id}:`, e instanceof Error ? e.message : e);
    }
  }

  for (const part of chunk(clusteredIds, 100)) {
    await db.from('raw_articles').update({ status: 'clustered' }).in('id', part);
  }

  const now = new Date();
  for (const [id, st] of states) {
    if (!st.dirty) continue;
    const { importance, trend } = computeScores(st.members, now);
    await db.from('news_events').update({
      title: st.title,
      entities: st.candidate.entities,
      importance_score: importance,
      trend_score: trend,
      first_seen_at: st.firstSeen.toISOString(),
      last_updated_at: st.candidate.lastUpdatedAt.toISOString(),
    }).eq('id', id);
  }
  return stats;
}
