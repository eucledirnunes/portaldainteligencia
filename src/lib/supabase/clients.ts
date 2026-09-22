import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente com service role: ignora RLS. Uso EXCLUSIVO em servidor
 * (CLIs de ingestão/eventos/editorial e rotas /admin). Nunca importar em Client Components.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja .env.example).');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let publicClient: SupabaseClient | null | undefined;

/** Cliente anon (sujeito a RLS) para o portal público. Retorna null se o Supabase não estiver configurado. */
export function getPublicClient(): SupabaseClient | null {
  if (publicClient !== undefined) return publicClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  publicClient = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return publicClient;
}
