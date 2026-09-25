-- Permite JPEG/WebP no bucket de capas, além de PNG — necessário para o painel /admin/capas
-- aceitar upload manual de imagens escolhidas pelo usuário (as geradas por IA continuam PNG).
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'article-covers';
