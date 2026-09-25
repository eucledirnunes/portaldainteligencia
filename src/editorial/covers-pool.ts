import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256 } from '@/lib/utils/hash';
import type { ImageProvider } from './images';

/**
 * Pool de capas por categoria: em vez de gerar uma imagem por matéria (custo por matéria),
 * geramos POOL_SIZE variações por categoria UMA VEZ (npm run covers:seed) e cada matéria
 * reaproveita uma delas, escolhida de forma determinística pelo próprio id — sem custo por matéria.
 */
export const POOL_SIZE = 4;
export const FALLBACK_CATEGORY = 'geral';
const BUCKET = 'article-covers';

/** Pequenas variações de composição para não gerar 4 imagens quase idênticas por categoria. */
const MOTIFS = [
  'flowing network nodes and connecting lines',
  'stacked geometric layers suggesting data and structure',
  'a radiating grid pattern suggesting signal and scale',
  'overlapping circular shapes suggesting cycles and growth',
];

export function buildCategoryCoverPrompt(categoryLabel: string, variantIndex: number): string {
  const motif = MOTIFS[variantIndex % MOTIFS.length];
  return (
    `Minimalist abstract editorial illustration representing the theme "${categoryLabel}" in the context of artificial intelligence news, ` +
    `composed of ${motif}. Flat vector style, navy (#0A0E17) and cobalt blue (#0051D5) palette with a touch of emerald (#4EDEA3). ` +
    'No text, no logos, no watermarks, no readable letters, no photorealistic people, no faces. ' +
    'Clean, modern, print-magazine cover aesthetic, high contrast, suitable as a recurring news category thumbnail.'
  );
}

const path = (categorySlug: string, i: number) => `categories/${categorySlug}/${i}.png`;

/** Gera as POOL_SIZE variações de cada categoria (+ "geral", para matérias sem categoria). Idempotente: pula o que já existe. */
export async function seedCategoryCovers(
  db: SupabaseClient,
  provider: ImageProvider,
  opts: { force?: boolean } = {},
): Promise<{ created: number; skipped: number; failed: number }> {
  const stats = { created: 0, skipped: 0, failed: 0 };
  const cats = await db.from('categories').select('slug, name');
  if (cats.error) throw cats.error;
  const entries = [...(cats.data ?? []).map((c) => ({ slug: c.slug as string, name: c.name as string })), { slug: FALLBACK_CATEGORY, name: 'Inteligência Artificial' }];

  for (const cat of entries) {
    const existing = opts.force ? [] : (await db.storage.from(BUCKET).list(`categories/${cat.slug}`)).data ?? [];
    const have = new Set(existing.map((f) => f.name));
    for (let i = 0; i < POOL_SIZE; i++) {
      const objectPath = path(cat.slug, i);
      if (!opts.force && have.has(`${i}.png`)) {
        stats.skipped++;
        continue;
      }
      try {
        const bytes = await provider.generate(buildCategoryCoverPrompt(cat.name, i));
        const up = await db.storage.from(BUCKET).upload(objectPath, bytes, { contentType: 'image/png', upsert: true });
        if (up.error) throw up.error;
        stats.created++;
        console.log(`  ✓ ${objectPath}`);
      } catch (e) {
        stats.failed++;
        console.error(`  ✗ ${objectPath}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  return stats;
}

export type CoverPool = Map<string, string[]>;

/** Carrega as URLs públicas de todas as capas já geradas, agrupadas por categoria. */
export async function loadCoverPool(db: SupabaseClient): Promise<CoverPool> {
  const cats = await db.from('categories').select('slug');
  if (cats.error) throw cats.error;
  const slugs = [...(cats.data ?? []).map((c) => c.slug as string), FALLBACK_CATEGORY];
  const pool: CoverPool = new Map();
  await Promise.all(
    slugs.map(async (slug) => {
      const { data } = await db.storage.from(BUCKET).list(`categories/${slug}`);
      const urls = (data ?? [])
        .filter((f) => f.name.endsWith('.png'))
        .map((f) => db.storage.from(BUCKET).getPublicUrl(`categories/${slug}/${f.name}`).data.publicUrl);
      if (urls.length) pool.set(slug, urls);
    }),
  );
  return pool;
}

export interface CoverSlot {
  index: number;
  url: string | null;
}
export interface CoverCategory {
  slug: string;
  name: string;
  slots: CoverSlot[];
}

/** Lista, por categoria, as POOL_SIZE posições do pool e o que há em cada uma (para o painel /admin/capas). */
export async function listCoverSlots(db: SupabaseClient): Promise<CoverCategory[]> {
  const cats = await db.from('categories').select('slug, name').order('sort_order');
  if (cats.error) throw cats.error;
  const entries = [...(cats.data ?? []).map((c) => ({ slug: c.slug as string, name: c.name as string })), { slug: FALLBACK_CATEGORY, name: 'Geral (sem categoria)' }];

  return Promise.all(
    entries.map(async (cat) => {
      const { data } = await db.storage.from(BUCKET).list(`categories/${cat.slug}`);
      const have = new Map((data ?? []).map((f) => [f.name, f]));
      const slots: CoverSlot[] = Array.from({ length: POOL_SIZE }, (_, i) => {
        const file = have.get(`${i}.png`);
        return { index: i, url: file ? db.storage.from(BUCKET).getPublicUrl(path(cat.slug, i)).data.publicUrl : null };
      });
      return { slug: cat.slug, name: cat.name, slots };
    }),
  );
}

/** Substitui uma posição específica do pool por uma imagem gerada agora. Usado pelo painel /admin/capas. */
export async function regenerateSlot(db: SupabaseClient, provider: ImageProvider, categorySlug: string, categoryName: string, index: number): Promise<void> {
  const bytes = await provider.generate(buildCategoryCoverPrompt(categoryName, index));
  const up = await db.storage.from(BUCKET).upload(path(categorySlug, index), bytes, { contentType: 'image/png', upsert: true });
  if (up.error) throw up.error;
}

/** Sobe um arquivo escolhido manualmente para uma posição do pool. Usado pelo painel /admin/capas. */
export async function uploadSlot(db: SupabaseClient, categorySlug: string, index: number, bytes: Uint8Array, contentType: string): Promise<void> {
  const up = await db.storage.from(BUCKET).upload(path(categorySlug, index), bytes, { contentType, upsert: true });
  if (up.error) throw up.error;
}

/** Escolha determinística (mesma matéria = sempre a mesma capa) dentro do pool da categoria, com fallback para "geral". */
export function pickCover(pool: CoverPool, categorySlug: string | null, seedKey: string): string | null {
  const urls = (categorySlug && pool.get(categorySlug)) || pool.get(FALLBACK_CATEGORY);
  if (!urls?.length) return null;
  const n = parseInt(sha256(seedKey).slice(0, 8), 16);
  return urls[n % urls.length];
}
