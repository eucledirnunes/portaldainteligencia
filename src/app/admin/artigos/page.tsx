import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';
import { setArticleStatus } from '../actions';

type Row = { id: string; title: string; slug: string; status: string; generated_by: string; published_at: string | null; created_at: string; featured_image: string | null; category: { name: string } | { name: string }[] | null };
const NEXT: Record<string, { status: string; label: string }[]> = {
  draft: [{ status: 'review', label: 'Enviar p/ revisão' }, { status: 'published', label: 'Publicar' }],
  review: [{ status: 'published', label: 'Publicar' }, { status: 'archived', label: 'Arquivar' }],
  published: [{ status: 'review', label: 'Despublicar' }, { status: 'archived', label: 'Arquivar' }],
  archived: [{ status: 'review', label: 'Restaurar' }],
};

export default async function AdminArticles({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? 'review';
  const { data, error } = await createServiceClient()
    .from('articles').select('id, title, slug, status, generated_by, published_at, created_at, featured_image, category:categories(name)')
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
          <thead className="meta border-b border-line"><tr><th className="p-3">Capa</th><th>Criado</th><th>Título</th><th>Gerado por</th><th>Ações</th></tr></thead>
          <tbody>
            {(data as Row[]).map((a) => {
              const category = Array.isArray(a.category) ? a.category[0] : a.category;
              return (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="p-3">
                  <div className="h-12 w-20 overflow-hidden rounded bg-low">
                    {a.featured_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.featured_image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[0.6rem] text-muted">Sem capa</div>
                    )}
                  </div>
                  {category && <p className="meta mt-1 whitespace-nowrap">{category.name}</p>}
                </td>
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
              );
            })}
          </tbody>
        </table>
        {!data?.length && <p className="p-4 text-sm text-muted">Nenhum artigo com status “{status}”.</p>}
      </div>
    </>
  );
}
