import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';
import { setArticleStatus } from '../actions';

type Row = { id: string; title: string; slug: string; status: string; generated_by: string; published_at: string | null; created_at: string };
const NEXT: Record<string, { status: string; label: string }[]> = {
  draft: [{ status: 'review', label: 'Enviar p/ revisão' }, { status: 'published', label: 'Publicar' }],
  review: [{ status: 'published', label: 'Publicar' }, { status: 'archived', label: 'Arquivar' }],
  published: [{ status: 'review', label: 'Despublicar' }, { status: 'archived', label: 'Arquivar' }],
  archived: [{ status: 'review', label: 'Restaurar' }],
};

export default async function AdminArticles({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? 'review';
  const { data, error } = await createServiceClient()
    .from('articles').select('id, title, slug, status, generated_by, published_at, created_at')
    .eq('status', status).order('created_at', { ascending: false }).limit(100);
  if (error) return <p>{error.message}</p>;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Status: {['draft', 'review', 'published', 'archived'].map((s) => (
          <Link key={s} href={`?status=${s}`} className={`mr-3 hover:underline ${s === status ? 'font-semibold text-ink' : ''}`}>{s}</Link>
        ))}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="meta border-b border-line"><tr><th className="p-3">Criado</th><th>Título</th><th>Gerado por</th><th>Ações</th></tr></thead>
          <tbody>
            {(data as Row[]).map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap p-3">{formatDateTime(a.created_at)}</td>
                <td className="max-w-lg">{a.status === 'published' ? <Link href={`/noticias/${a.slug}`} className="hover:text-accent">{a.title}</Link> : a.title}</td>
                <td>{a.generated_by}</td>
                <td className="whitespace-nowrap">
                  {NEXT[a.status]?.map((n) => (
                    <form key={n.status} action={setArticleStatus} className="mr-2 inline">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={n.status} />
                      <button className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent">{n.label}</button>
                    </form>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="p-4 text-sm text-muted">Nenhum artigo com status “{status}”.</p>}
      </div>
    </>
  );
}
