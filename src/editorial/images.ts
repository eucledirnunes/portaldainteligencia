import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ilustrações de capa geradas por IA. Nunca usamos fotos de terceiros (ver src/lib/site.ts):
 * a capa é sempre arte abstrata/ilustrativa própria, nunca uma "foto" do fato, para não parecer
 * registro jornalístico.
 *
 * Dois provedores possíveis (interface comum ImageProvider), escolhidos por IMAGE_PROVIDER:
 * - openai (padrão se OPENAI_API_KEY existir): gpt-image-1, quality "medium" (~US$ 0,04–0,07/imagem
 *   em 1024x1024 segundo a tabela pública da OpenAI em set/2026; confirme em platform.openai.com/docs/pricing).
 * - cloudflare: Workers AI (FLUX.1 [schnell]), gratuito até a cota diária da conta.
 */

const BUCKET = 'article-covers';

export interface ImageProvider {
  readonly name: string;
  generate(prompt: string): Promise<Uint8Array>;
}

class CloudflareImageProvider implements ImageProvider {
  readonly name = 'cloudflare';
  private static readonly MODEL = '@cf/black-forest-labs/flux-1-schnell';
  constructor(private readonly accountId: string, private readonly apiToken: string) {}

  async generate(prompt: string): Promise<Uint8Array> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${CloudflareImageProvider.MODEL}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 4 }),
    });
    const json = (await res.json()) as { success: boolean; result?: { image?: string }; errors?: unknown };
    if (!res.ok || !json.success || !json.result?.image) {
      throw new Error(`Cloudflare Workers AI falhou: HTTP ${res.status} ${JSON.stringify(json.errors ?? '')}`);
    }
    return Uint8Array.from(Buffer.from(json.result.image, 'base64'));
  }
}

class OpenAIImageProvider implements ImageProvider {
  readonly name = 'openai';
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    private readonly quality = process.env.OPENAI_IMAGE_QUALITY || 'medium',
  ) {}

  async generate(prompt: string): Promise<Uint8Array> {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, size: '1024x1024', quality: this.quality, n: 1 }),
    });
    const json = (await res.json()) as { data?: { b64_json?: string }[]; error?: { message?: string } };
    const b64 = json.data?.[0]?.b64_json;
    if (!res.ok || !b64) {
      throw new Error(`OpenAI Images falhou: HTTP ${res.status} ${json.error?.message ?? ''}`);
    }
    return Uint8Array.from(Buffer.from(b64, 'base64'));
  }
}

/** Escolhe o provedor por IMAGE_PROVIDER, ou OpenAI se houver chave, senão Cloudflare, senão null. */
export function createImageProvider(env: NodeJS.ProcessEnv = process.env): ImageProvider | null {
  const pick = (env.IMAGE_PROVIDER ?? '').toLowerCase();
  const hasOpenAI = !!env.OPENAI_API_KEY;
  const hasCloudflare = !!(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);

  if (pick === 'cloudflare' && hasCloudflare) return new CloudflareImageProvider(env.CLOUDFLARE_ACCOUNT_ID!, env.CLOUDFLARE_API_TOKEN!);
  if (pick === 'openai' && hasOpenAI) return new OpenAIImageProvider(env.OPENAI_API_KEY!);
  if (hasOpenAI) return new OpenAIImageProvider(env.OPENAI_API_KEY!);
  if (hasCloudflare) return new CloudflareImageProvider(env.CLOUDFLARE_ACCOUNT_ID!, env.CLOUDFLARE_API_TOKEN!);
  return null;
}

/** Prompt sempre abstrato/editorial: sem retratar pessoas reais, sem texto, sem se passar por foto. */
export function buildCoverPrompt(categoryLabel: string | null, title: string): string {
  const topic = categoryLabel ? `sobre o tema "${categoryLabel}"` : 'sobre inteligência artificial';
  return (
    `Minimalist abstract editorial illustration ${topic}, inspired by the headline "${title}". ` +
    'Flat vector style, geometric shapes, circuit-like or network motifs, navy (#0A0E17) and cobalt blue (#0051D5) palette ' +
    'with a touch of emerald (#4EDEA3). No text, no logos, no watermarks, no readable letters, no photorealistic people, no faces. ' +
    'Clean, modern, print-magazine cover aesthetic, high contrast, suitable as a news article thumbnail.'
  );
}

/** Gera a capa, sobe para o Storage e devolve a URL pública. Nunca lança: retorna null em qualquer falha. */
export async function generateAndUploadCover(
  db: SupabaseClient,
  provider: ImageProvider,
  opts: { articleId: string; title: string; categoryLabel: string | null },
): Promise<string | null> {
  try {
    const prompt = buildCoverPrompt(opts.categoryLabel, opts.title);
    const bytes = await provider.generate(prompt);
    const path = `${opts.articleId}.png`;
    const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: true });
    if (up.error) throw up.error;
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(`generateAndUploadCover (${provider.name}): ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
