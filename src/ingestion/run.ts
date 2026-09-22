import type { SupabaseClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import type { SourceRow } from '@/domain/types';
import { RssCollector } from './rss/rss-collector';
import { ScraperCollector } from './scraper/scraper-collector';
import { normalizeItem } from './normalizers/normalize';
import { isAdvertisement, isAiRelated } from './processors/ai-filter';
import { filterNewItems } from './processors/dedupe';
import { insertRawArticles, loadExistingKeys, toInsert } from './processors/persist';
import type { NormalizedItem, RunStats, SourceCollector } from './types';

const DEFAULT_MAX_ITEMS = 50;

function collectorFor(source: SourceRow): SourceCollector {
  switch (source.source_type) {
    case 'rss':
      return new RssCollector();
    case 'scraper':
      return new ScraperCollector();
    default:
      throw new Error(`source_type "${source.source_type}" ainda não implementado`);
  }
}

/** Coleta + normaliza (sem tocar no banco). */
export async function collectAndNormalize(source: SourceRow): Promise<NormalizedItem[]> {
  const raw = await collectorFor(source).collect(source);
  const items = raw.map((r) => normalizeItem(source, r)).filter((i): i is NormalizedItem => i !== null);
  // Mais recentes primeiro; limita o volume por execução (evita backfill agressivo).
  items.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  return items.slice(0, source.config.max_items ?? DEFAULT_MAX_ITEMS);
}

async function ingestSource(db: SupabaseClient, source: SourceRow): Promise<RunStats> {
  const started = Date.now();
  const stats: RunStats = { source: source.slug, ok: false, fetched: 0, inserted: 0, skipped: 0, ignored: 0, error: null, durationMs: 0 };
  const run = await db.from('ingestion_runs').insert({ source_id: source.id }).select('id').single();
  try {
    const items = await collectAndNormalize(source);
    stats.fetched = items.length;
    const existing = await loadExistingKeys(db, source.id, items);
    const { fresh, skipped } = filterNewItems(items, existing);
    stats.skipped = skipped;

    const rows = fresh.map((it) => {
      const relevant = (!source.config.ai_filter || isAiRelated(it.title, it.description)) && !isAdvertisement(it.title, it.description);
      if (!relevant) stats.ignored++;
      return toInsert(source, it, relevant ? 'new' : 'ignored');
    });
    stats.inserted = await insertRawArticles(db, rows);
    stats.ok = true;
  } catch (e) {
    stats.error = e instanceof Error ? e.message : JSON.stringify(e);
  }
  stats.durationMs = Date.now() - started;

  await db.from('sources').update({ last_checked_at: new Date().toISOString() }).eq('id', source.id);
  if (run.data?.id) {
    await db
      .from('ingestion_runs')
      .update({
        finished_at: new Date().toISOString(),
        ok: stats.ok,
        fetched: stats.fetched,
        inserted: stats.inserted,
        skipped: stats.skipped,
        error: stats.error,
      })
      .eq('id', run.data.id);
  }
  return stats;
}

export async function runIngestion(db: SupabaseClient, opts: { only?: string[]; concurrency?: number } = {}): Promise<RunStats[]> {
  let q = db.from('sources').select('*').eq('active', true).in('source_type', ['rss', 'scraper']);
  if (opts.only?.length) q = q.in('slug', opts.only);
  const { data, error } = await q;
  if (error) throw error;
  const limit = pLimit(opts.concurrency ?? 4);
  return Promise.all((data as SourceRow[]).map((s) => limit(() => ingestSource(db, s))));
}
