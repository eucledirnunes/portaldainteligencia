import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawArticleInsert, RawArticleStatus, SourceRow } from '@/domain/types';
import type { NormalizedItem } from '../types';
import type { ExistingKeys } from './dedupe';

const chunk = <T>(arr: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export async function loadExistingKeys(db: SupabaseClient, sourceId: string, items: NormalizedItem[]): Promise<ExistingKeys> {
  const keys: ExistingKeys = { canonicalUrls: new Set(), externalIds: new Set(), hashes: new Set() };
  for (const part of chunk(items, 100)) {
    // canonical_url é único globalmente (a mesma matéria vinda de outra fonte também é barrada).
    const byUrl = await db.from('raw_articles').select('canonical_url').in('canonical_url', part.map((i) => i.canonicalUrl));
    if (byUrl.error) throw byUrl.error;
    byUrl.data.forEach((r) => keys.canonicalUrls.add(r.canonical_url));

    const byHash = await db.from('raw_articles').select('content_hash').eq('source_id', sourceId).in('content_hash', part.map((i) => i.contentHash));
    if (byHash.error) throw byHash.error;
    byHash.data.forEach((r) => keys.hashes.add(r.content_hash));

    const ext = part.map((i) => i.externalId).filter((v): v is string => !!v);
    if (ext.length) {
      const byExt = await db.from('raw_articles').select('external_id').eq('source_id', sourceId).in('external_id', ext);
      if (byExt.error) throw byExt.error;
      byExt.data.forEach((r) => keys.externalIds.add(r.external_id));
    }
  }
  return keys;
}

export function toInsert(source: SourceRow, it: NormalizedItem, status: RawArticleStatus): RawArticleInsert {
  return {
    source_id: source.id,
    external_id: it.externalId,
    url: it.url,
    canonical_url: it.canonicalUrl,
    original_title: it.title,
    original_description: it.description,
    original_content: it.content,
    author: it.author,
    image_url: it.imageUrl,
    published_at: it.publishedAt,
    content_hash: it.contentHash,
    language: it.language,
    status,
    metadata: it.metadata,
  };
}

/** Insere ignorando conflitos de canonical_url; se outro índice único colidir, cai para linha a linha. */
export async function insertRawArticles(db: SupabaseClient, rows: RawArticleInsert[]): Promise<number> {
  let inserted = 0;
  for (const part of chunk(rows, 50)) {
    const { data, error } = await db
      .from('raw_articles')
      .upsert(part, { onConflict: 'canonical_url', ignoreDuplicates: true })
      .select('id');
    if (!error) {
      inserted += data?.length ?? 0;
      continue;
    }
    if (error.code !== '23505') throw error;
    for (const row of part) {
      const one = await db.from('raw_articles').insert(row);
      if (!one.error) inserted++;
      else if (one.error.code !== '23505') throw one.error;
    }
  }
  return inserted;
}
