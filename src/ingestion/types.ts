import type { SourceRow } from '@/domain/types';

/** Item cru devolvido por um coletor (RSS/scraper), antes da normalização. */
export interface FeedItem {
  externalId?: string | null;
  url: string;
  title: string;
  descriptionHtml?: string | null;
  contentHtml?: string | null;
  author?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | Date | null;
  categories?: string[];
}

/** Contrato comum: RSS hoje, scraper/API amanhã. */
export interface SourceCollector {
  collect(source: SourceRow): Promise<FeedItem[]>;
}

export interface NormalizedItem {
  externalId: string | null;
  url: string;
  canonicalUrl: string;
  title: string;
  description: string | null;
  content: string | null;
  author: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  contentHash: string;
  language: string | null;
  metadata: Record<string, unknown>;
}

export interface RunStats {
  source: string;
  ok: boolean;
  fetched: number;
  inserted: number;
  skipped: number;
  ignored: number;
  error: string | null;
  durationMs: number;
}
