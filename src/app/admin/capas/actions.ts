'use server';

import { revalidatePath } from 'next/cache';
import { createImageProvider } from '@/editorial/images';
import { POOL_SIZE, regenerateSlot, uploadSlot } from '@/editorial/covers-pool';
import { createServiceClient } from '@/lib/supabase/clients';

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const slugRe = /^[a-z0-9-]+$/;

function parseSlot(formData: FormData): { slug: string; name: string; index: number } {
  const slug = String(formData.get('slug') ?? '');
  const name = String(formData.get('name') ?? '');
  const index = Number(formData.get('index'));
  if (!slugRe.test(slug) || !name || !Number.isInteger(index) || index < 0 || index >= POOL_SIZE) {
    throw new Error('Parâmetros inválidos');
  }
  return { slug, name, index };
}

/** Gera uma nova imagem por IA para uma posição específica do pool, substituindo a atual. */
export async function regenerateCover(formData: FormData) {
  const { slug, name, index } = parseSlot(formData);
  const provider = createImageProvider();
  if (!provider) throw new Error('Nenhum provedor de imagem configurado (OPENAI_API_KEY ou CLOUDFLARE_*).');
  await regenerateSlot(createServiceClient(), provider, slug, name, index);
  revalidatePath('/admin/capas');
}

/** Sobe um arquivo escolhido manualmente para uma posição do pool, substituindo a atual. */
export async function uploadCover(formData: FormData) {
  const { slug, index } = parseSlot(formData);
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) throw new Error('Escolha um arquivo de imagem.');
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Formato não suportado. Use PNG, JPEG ou WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Arquivo maior que 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  await uploadSlot(createServiceClient(), slug, index, bytes, file.type);
  revalidatePath('/admin/capas');
}
