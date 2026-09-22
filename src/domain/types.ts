// Tipos das linhas do banco (espelham supabase/migrations/0001_init.sql).
export type SourceType = 'rss' | 'scraper' | 'api';

export interface SourceRow {
  id: string;
  name: string;
  slug: string;
  website_url: string;
  feed_url: string | null;
  source_type: SourceType;
  is_primary_source: boolean;
  reliability_level: number;
  language: string;
  country: string | null;
  company_id: string | null;
  active: boolean;
  config: SourceConfig;
  last_checked_at: string | null;
}

export interface SourceConfig {
  /** Feed generalista: só entram itens que passam no filtro de IA. */
  ai_filter?: boolean;
  /** Máximo de itens processados por execução (default 50). */
  max_items?: number;
  /** Config do scraper (source_type = 'scraper'). */
  scraper?: ScraperConfig;
  note?: string;
}

export interface ScraperConfig {
  listing_url: string;
  /** Seletor CSS de cada item/card na listagem. */
  item_selector: string;
  link_selector?: string; // default: primeiro <a> do item
  title_selector?: string; // default: texto do link
  description_selector?: string;
  date_selector?: string;
  image_selector?: string;
}

export type RawArticleStatus = 'new' | 'clustered' | 'ignored' | 'error';

export interface RawArticleInsert {
  source_id: string;
  external_id: string | null;
  url: string;
  canonical_url: string;
  original_title: string;
  original_description: string | null;
  original_content: string | null;
  author: string | null;
  image_url: string | null;
  published_at: string | null;
  content_hash: string;
  language: string | null;
  status: RawArticleStatus;
  metadata: Record<string, unknown>;
}

export interface RawArticleRow extends RawArticleInsert {
  id: string;
  scraped_at: string;
  created_at: string;
}

export type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  show_in_nav: boolean;
}
export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
}
export interface ModelRow {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  release_date: string | null;
  status: string;
  metadata: Record<string, unknown>;
}

export interface ArticleRow {
  id: string;
  event_id: string | null;
  title: string;
  subtitle: string | null;
  slug: string;
  summary: string | null;
  content: string | null;
  featured_image: string | null;
  category_id: string | null;
  status: ArticleStatus;
  seo_title: string | null;
  seo_description: string | null;
  generated_by: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
