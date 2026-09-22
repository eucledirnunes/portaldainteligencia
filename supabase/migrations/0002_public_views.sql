-- Views públicas (somente leitura, sem dados sensíveis) para a barra de telemetria e a página /fontes.
-- Rodam com privilégios do dono (como article_sources), então não abrem as tabelas base ao anon.

create or replace view public_stats as
select
  (select count(*) from sources where active)                                              as active_sources,
  (select max(last_checked_at) from sources where active)                                  as last_checked_at,
  (select count(*) from raw_articles where created_at > now() - interval '24 hours')       as raw_24h,
  (select count(*) from news_events  where created_at > now() - interval '24 hours')       as events_24h,
  (select count(*) from articles where status = 'published'
                                   and published_at > now() - interval '24 hours')         as published_24h;

create or replace view public_sources as
select name, slug, website_url, source_type, is_primary_source, reliability_level,
       language, country, active, last_checked_at
from sources;

grant select on public_stats, public_sources to anon, authenticated;
