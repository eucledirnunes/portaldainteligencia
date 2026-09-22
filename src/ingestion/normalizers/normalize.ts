import type { SourceRow } from '@/domain/types';
import { canonicalizeUrl } from '@/lib/utils/url';
import { sha256 } from '@/lib/utils/hash';
import { fold, stripHtml, stripPromo, truncate } from '@/lib/utils/text';
import type { FeedItem, NormalizedItem } from '../types';

const MAX_CONTENT = 200_000;

function parseDate(v: string | Date | null | undefined, now: Date): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  // Datas no futuro (>1 dia) costumam ser erro de fuso/feed: limita a "agora".
  return (d.getTime() > now.getTime() + 86_400_000 ? now : d).toISOString();
}

/** Hash do conteúdo semântico (título + início da descrição), independente de URL/tracking. */
export function contentHash(title: string, description: string | null): string {
  const norm = (s: string) => fold(s).replace(/\s+/g, ' ').trim();
  return sha256(`${norm(title)}|${norm(description ?? '').slice(0, 500)}`);
}

export function normalizeItem(source: Pick<SourceRow, 'language'>, item: FeedItem, now = new Date()): NormalizedItem | null {
  const title = stripHtml(item.title);
  const rawUrl = (item.url ?? '').trim();
  if (!title || !/^https?:\/\//i.test(rawUrl)) return null;

  const description = truncate(stripPromo(stripHtml(item.descriptionHtml ?? '')), 1000) || null;
  const image = item.imageUrl && /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : null;

  return {
    externalId: item.externalId?.trim() || null,
    url: rawUrl,
    canonicalUrl: canonicalizeUrl(rawUrl),
    title,
    description,
    content: item.contentHtml ? item.contentHtml.slice(0, MAX_CONTENT) : null,
    author: typeof item.author === "string" ? item.author.trim() || null : null,
    imageUrl: image,
    publishedAt: parseDate(item.publishedAt, now),
    contentHash: contentHash(title, description),
    language: source.language,
    metadata: item.categories?.length ? { categories: item.categories } : {},
  };
}
