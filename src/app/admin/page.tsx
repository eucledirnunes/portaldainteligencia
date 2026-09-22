import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';

async function count(db: ReturnType<typeof createServiceClient>, table: string, filter?: [string, string]) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  return (await q).count ?? 0;
}

export default async function AdminHome() {
  let db;
  try { db = createServiceClient(); } catch (e) {
    return <p className="rounded-lg border border-line bg-surface p-4 text-sm">{(e as Error).message}</p>;
  }
  const [sources, rawNew, events, review, published, runs] = await Promise.all([
    count(db, 'sources', ['active', 'true']),
    count(db, 'raw_articles', ['status', 'new']),
    count(db, 'news_events'),
    count(db, 'articles', ['status', 'review']),
    count(db, 'articles', ['status', 'published']),
    db.from('ingestion_runs').select('started_at, ok, fetched, inserted, skipped, error, sources(name)').order('started_at', { ascending: false }).limit(15),
  ]);
  const cards = [
    ['Fontes ativas', sources], ['Brutas aguardando evento', rawNew], ['Eventos', events],
    ['Artigos em revisão', review], ['Artigos publicados', published],
  ] as const;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map(([label, n]) => (
          <li key={label} className="rounded-xl border border-line bg-surface p-4">
            <p className="headline text-3xl">{n}</p>
            <p className="meta">{label}</p>
          </li>
        ))}
      </ul>
      <h2 className="headline mb-3 mt-10 text-xl">Últimas coletas</h2>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="meta border-b border-line"><tr><th className="p-3">Quando</th><th>Fonte</th><th>Status</th><th>Lidas</th><th>Novas</th><th>Duplicadas</th><th>Erro</th></tr></thead>
          <tbody>
            {((runs.data ?? []) as unknown as { started_at: string; ok: boolean | null; fetched: number; inserted: number; skipped: number; error: string | null; sources: { name: string } | null }[]).map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="p-3 whitespace-nowrap">{formatDateTime(r.started_at)}</td>
                <td>{r.sources?.name}</td>
                <td>{r.ok === null ? '…' : r.ok ? 'OK' : 'Erro'}</td>
                <td>{r.fetched}</td><td>{r.inserted}</td><td>{r.skipped}</td>
                <td className="max-w-xs truncate text-muted" title={r.error ?? ''}>{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
