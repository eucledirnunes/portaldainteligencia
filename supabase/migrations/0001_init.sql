-- Portal de notícias de IA — schema inicial
-- Fluxo: sources -> raw_articles -> news_events (+event_sources) -> articles -> portal

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Taxonomia: categories (tópicos), companies, models
-- "Últimas" não é categoria: é a listagem de tudo (/ultimas).
-- ChatGPT/Claude/Gemini/Grok/Llama são modelos/produtos (tabela models), não categorias.
-- ---------------------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  sort_order  int  not null default 100,
  show_in_nav boolean not null default false,
  created_at  timestamptz not null default now()
);

create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  website_url text,
  description text,
  created_at  timestamptz not null default now()
);

create table models (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid references companies(id) on delete set null,
  name         text not null,
  slug         text not null unique,
  description  text,
  release_date date,
  status       text not null default 'active' check (status in ('active','deprecated','announced')),
  -- Reservado p/ context window, preço de API, benchmarks, modalidades, histórico de releases.
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index models_company_idx on models(company_id);
create trigger models_updated before update on models for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- FONTES
-- ---------------------------------------------------------------------------
create table sources (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  website_url        text not null,
  feed_url           text,
  source_type        text not null check (source_type in ('rss','scraper','api')),
  is_primary_source  boolean not null default false,  -- fonte primária (o próprio laboratório/empresa)
  reliability_level  smallint not null default 3 check (reliability_level between 1 and 5),
  language           text not null default 'en',
  country            text,
  company_id         uuid references companies(id) on delete set null,
  active             boolean not null default true,
  -- Config específica: ai_filter (feed generalista), scraper selectors, etc.
  config             jsonb not null default '{}'::jsonb,
  last_checked_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger sources_updated before update on sources for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- NOTÍCIAS BRUTAS (exatamente o que a fonte publicou)
-- ---------------------------------------------------------------------------
create table raw_articles (
  id                   uuid primary key default gen_random_uuid(),
  source_id            uuid not null references sources(id) on delete cascade,
  external_id          text,
  url                  text not null,
  canonical_url        text not null,
  original_title       text not null,
  original_description text,
  original_content     text,
  author               text,
  image_url            text,
  published_at         timestamptz,
  scraped_at           timestamptz not null default now(),
  content_hash         text not null,
  language             text,
  status               text not null default 'new'
                         check (status in ('new','clustered','ignored','error')),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
-- Anti-duplicidade em 3 camadas:
create unique index raw_articles_canonical_url_uq on raw_articles(canonical_url);
create unique index raw_articles_source_external_uq on raw_articles(source_id, external_id) where external_id is not null;
create unique index raw_articles_source_hash_uq on raw_articles(source_id, content_hash);
create index raw_articles_status_idx on raw_articles(status, published_at desc);
create index raw_articles_published_idx on raw_articles(published_at desc);
-- Preparado para embeddings (ver docs/ARCHITECTURE.md): create extension vector; alter table raw_articles add column embedding vector(1536);

-- ---------------------------------------------------------------------------
-- EVENTOS / ASSUNTOS (o acontecimento; várias fontes -> um evento)
-- ---------------------------------------------------------------------------
create table news_events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text not null unique,
  summary          text,
  category_id      uuid references categories(id) on delete set null,
  importance_score real not null default 0,
  trend_score      real not null default 0,
  entities         jsonb not null default '{}'::jsonb,   -- {companies:[], models:[], tokens:[]} usado pelo EventMatcher
  first_seen_at    timestamptz not null default now(),
  last_updated_at  timestamptz not null default now(),
  status           text not null default 'active' check (status in ('active','merged','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index news_events_last_updated_idx on news_events(last_updated_at desc);
create index news_events_trend_idx on news_events(trend_score desc);
create trigger news_events_updated before update on news_events for each row execute function set_updated_at();

create table event_sources (
  event_id         uuid not null references news_events(id) on delete cascade,
  raw_article_id   uuid not null references raw_articles(id) on delete cascade,
  relevance_score  real not null default 1,
  is_primary_source boolean not null default false,
  primary key (event_id, raw_article_id)
);
create unique index event_sources_raw_uq on event_sources(raw_article_id);  -- um raw pertence a um evento

create table event_companies (
  event_id   uuid not null references news_events(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (event_id, company_id)
);
create table event_models (
  event_id uuid not null references news_events(id) on delete cascade,
  model_id uuid not null references models(id) on delete cascade,
  primary key (event_id, model_id)
);
create index event_companies_company_idx on event_companies(company_id);
create index event_models_model_idx on event_models(model_id);

-- ---------------------------------------------------------------------------
-- ARTIGOS (matéria final publicada)
-- ---------------------------------------------------------------------------
create table articles (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references news_events(id) on delete set null,
  title           text not null,
  subtitle        text,
  slug            text not null unique,
  summary         text,
  content         text,
  featured_image  text,
  category_id     uuid references categories(id) on delete set null,
  status          text not null default 'draft' check (status in ('draft','review','published','archived')),
  seo_title       text,
  seo_description text,
  generated_by    text not null default 'basic',   -- basic | openai | anthropic | gemini | human
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index articles_event_uq on articles(event_id) where event_id is not null;
create index articles_feed_idx on articles(status, published_at desc);
create index articles_category_idx on articles(category_id, published_at desc);
create index articles_title_trgm on articles using gin (title gin_trgm_ops);
create index articles_summary_trgm on articles using gin (summary gin_trgm_ops);
create index companies_name_trgm on companies using gin (name gin_trgm_ops);
create index models_name_trgm on models using gin (name gin_trgm_ops);
create trigger articles_updated before update on articles for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Observabilidade da coleta
-- ---------------------------------------------------------------------------
create table ingestion_runs (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid references sources(id) on delete cascade,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  fetched     int not null default 0,
  inserted    int not null default 0,
  skipped     int not null default 0,
  error       text
);
create index ingestion_runs_source_idx on ingestion_runs(source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- View pública: "Fontes utilizadas" de cada artigo publicado.
-- Roda com os privilégios do dono, então não exige expor raw_articles/sources ao anon.
-- ---------------------------------------------------------------------------
create view article_sources as
select
  a.id            as article_id,
  s.name          as source_name,
  s.website_url   as source_website,
  s.is_primary_source,
  r.original_title,
  r.url           as url,
  r.published_at
from articles a
join event_sources es on es.event_id = a.event_id
join raw_articles r   on r.id = es.raw_article_id
join sources s        on s.id = r.source_id
where a.status = 'published';

-- ---------------------------------------------------------------------------
-- RLS: leitura pública apenas do que é público. Escrita só via service role.
-- ---------------------------------------------------------------------------
alter table categories      enable row level security;
alter table companies       enable row level security;
alter table models          enable row level security;
alter table sources         enable row level security;
alter table raw_articles    enable row level security;
alter table news_events     enable row level security;
alter table event_sources   enable row level security;
alter table event_companies enable row level security;
alter table event_models    enable row level security;
alter table articles        enable row level security;
alter table ingestion_runs  enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read companies"  on companies  for select using (true);
create policy "public read models"     on models     for select using (true);
create policy "public read published articles" on articles for select using (status = 'published');
create policy "public read events of published articles" on news_events for select
  using (exists (select 1 from articles a where a.event_id = news_events.id and a.status = 'published'));
create policy "public read event_companies" on event_companies for select using (true);
create policy "public read event_models"    on event_models    for select using (true);

grant select on article_sources to anon, authenticated;
