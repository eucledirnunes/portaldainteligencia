import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';

type Row = { id: string; original_title: string; url: string; status: string; published_at: string | null; sources: { name: string } | null };

export default async function AdminRaw({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status;
  let q = createServiceClient().from('raw_articles').select('id, original_title, url, status, published_at, sources(name)').order('published_at', { ascending: false, nullsFirst: false }).limit(150);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return <p>{error.message}</p>;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Filtrar: {['', 'new', 'clustered', 'ignored', 'error'].map((s) => (
          <a key={s} href={s ? `?status=${s}` : '?'} className={`mr-3 hover:underline ${status === s || (!status && !s) ? 'font-semibold text-ink' : ''}`}>{s || 'todas'}</a>
        ))}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="meta border-b border-line"><tr><th className="p-3">Publicado</th><th>Fonte</th><th>Título original</th><th>Status</th></tr></thead>
          <tbody>
            {(data as unknown as Row[]).map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap p-3">{formatDateTime(r.published_at)}</td>
                <td className="whitespace-nowrap">{r.sources?.name}</td>
                <td><a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{r.original_title}</a></td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
