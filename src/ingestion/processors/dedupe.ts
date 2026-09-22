import type { NormalizedItem } from '../types';

export interface ExistingKeys {
  canonicalUrls: Set<string>;
  externalIds: Set<string>;
  hashes: Set<string>;
}

/**
 * 1ª camada de anti-duplicidade (em memória; o banco garante a 2ª via índices únicos):
 * descarta repetidos no lote e itens já existentes por canonical_url, external_id ou content_hash.
 */
export function filterNewItems(items: NormalizedItem[], existing: ExistingKeys): { fresh: NormalizedItem[]; skipped: number } {
  const seenUrl = new Set<string>();
  const seenHash = new Set<string>();
  const seenExt = new Set<string>();
  const fresh: NormalizedItem[] = [];
  for (const it of items) {
    const dup =
      existing.canonicalUrls.has(it.canonicalUrl) ||
      seenUrl.has(it.canonicalUrl) ||
      existing.hashes.has(it.contentHash) ||
      seenHash.has(it.contentHash) ||
      (it.externalId !== null && (existing.externalIds.has(it.externalId) || seenExt.has(it.externalId)));
    if (dup) continue;
    seenUrl.add(it.canonicalUrl);
    seenHash.add(it.contentHash);
    if (it.externalId) seenExt.add(it.externalId);
    fresh.push(it);
  }
  return { fresh, skipped: items.length - fresh.length };
}
