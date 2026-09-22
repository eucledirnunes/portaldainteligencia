-- Bucket público para capas ilustrativas geradas por IA (nunca fotos de terceiros).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-covers', 'article-covers', true, 5242880, array['image/png'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/png'];

-- Leitura pública; escrita só via service role (usado pela nossa API, não passa por policy).
drop policy if exists "public read article covers" on storage.objects;
create policy "public read article covers" on storage.objects
  for select using (bucket_id = 'article-covers');
