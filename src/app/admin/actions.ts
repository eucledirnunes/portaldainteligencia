'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/clients';

const STATUSES = ['draft', 'review', 'published', 'archived'] as const;
const uuid = /^[0-9a-f-]{36}$/i;

/** Muda o status de um artigo. Publicar define published_at se ainda não houver. */
export async function setArticleStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!uuid.test(id) || !(STATUSES as readonly string[]).includes(status)) throw new Error('Parâmetros inválidos');

  const db = createServiceClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'published') {
    const { data } = await db.from('articles').select('published_at').eq('id', id).single();
    if (!data?.published_at) patch.published_at = new Date().toISOString();
  }
  const { error } = await db.from('articles').update(patch).eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/artigos');
  revalidatePath('/');
  revalidatePath('/ultimas');
}

export async function toggleSource(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const active = formData.get('active') === 'true';
  if (!uuid.test(id)) throw new Error('Parâmetros inválidos');
  const { error } = await createServiceClient().from('sources').update({ active }).eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/fontes');
}
