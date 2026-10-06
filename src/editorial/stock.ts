import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256 } from '@/lib/utils/hash';
import type { AIProvider } from './ai';

/**
 * Capas com foto de banco de imagens (Pixabay). A matéria ganha uma busca curta em inglês (feita pelo LLM),
 * a foto é escolhida de forma determinística entre as primeiras e BAIXADA para o nosso storage
 * (a API da Pixabay não permite hotlink permanente). Sem resultado bom, o chamador usa a ilustração da categoria.
 */
const BUCKET = 'article-covers';

export interface StockHit { id: number; url: string; tags: string; width: number; height: number }

export async function pixabaySearch(query: string, apiKey = process.env.PIXABAY_API_KEY): Promise<StockHit[]> {
  if (!apiKey || !query.trim()) return [];
  const u = new URL('https://pixabay.com/api/');
  u.search = new URLSearchParams({
    key: apiKey, q: query.slice(0, 100), image_type: 'photo', orientation: 'horizontal',
    safesearch: 'true', min_width: '1200', order: 'popular', per_page: '20',
  }).toString();
  const res = await fetch(u, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const json = (await res.json()) as { hits?: Record<string, any>[] };
  return (json.hits ?? []).map((h) => ({ id: h.id, url: h.largeImageURL, tags: h.tags ?? '', width: h.imageWidth, height: h.imageHeight }));
}

const QUERY_SYSTEM =
  'Você escolhe fotos de banco de imagens para ilustrar notícias de tecnologia. Responda SOMENTE JSON: {"query": string|null}. ' +
  '"query" = 2 a 4 palavras em INGLÊS descrevendo uma CENA FÍSICA e concreta e profissional (ex.: "business meeting office", "data center servers", ' +
  '"engineer laptop code", "courtroom gavel law", "stock market screen", "robot arm factory", "city skyline brazil"). ' +
  'Sem nomes de empresas, produtos ou pessoas; sem termos abstratos como "artificial intelligence", "AI", "brain", "hologram". ' +
  'Se não houver cena concreta plausível, use null.';

export async function buildStockQuery(provider: AIProvider, a: { title: string; summary?: string | null; category?: string | null }): Promise<string | null> {
  const res = await provider.generate({
    json: true, temperature: 0.2, maxTokens: 80, system: QUERY_SYSTEM,
    prompt: `Categoria: ${a.category ?? 'geral'}\nTítulo: ${a.title}\nResumo: ${a.summary ?? ''}`,
  });
  try {
    const q = (JSON.parse(res.text) as { query?: string | null }).query;
    return typeof q === 'string' && q.trim() ? q.trim().toLowerCase().slice(0, 60) : null;
  } catch {
    return null;
  }
}

/** Escolhe (determinístico por seedKey) entre as 8 primeiras fotos. */
export function pickStock(hits: StockHit[], seedKey: string): StockHit | null {
  const top = hits.slice(0, 8);
  if (!top.length) return null;
  return top[parseInt(sha256(seedKey).slice(0, 8), 16) % top.length];
}

/** Baixa a foto e guarda em stock/<slug>.jpg; devolve a URL pública. */
export async function storeStockCover(db: SupabaseClient, hit: StockHit, slug: string): Promise<string> {
  const res = await fetch(hit.url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `stock/${slug}.jpg`;
  const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw up.error;
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
