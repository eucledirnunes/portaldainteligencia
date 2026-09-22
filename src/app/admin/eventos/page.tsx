import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';

type Row = {
  id: string; title: string; importance_score: number; trend_score: number; last_updated_at: string;
  categories: { name: string } | null; event_sources: { count: number }[]; articles: { status: string }[];
};

export default async function AdminEvents() {
  const { data, error } = await createServiceClient()
    .from('news_events')
    .select('id, title, importance_score, trend_score, last_updated_at, categories(name), event_sources(count), articles(status)')
    .order('last_updated_at', { ascending: false })
    .limit(150);
  if (error) return <p>{error.message}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="meta border-b border-line"><tr><th className="p-3">Atualizado</th><th>Evento</th><th>Categoria</th><th>Fontes</th><th>Import.</th><th>Trend</th><th>Artigo</th></tr></thead>
        <tbody>
          {(data as unknown as Row[]).map((e) => (
            <tr key={e.id} className="border-b border-line last:border-0">
              <td className="whitespace-nowrap p-3">{formatDateTime(e.last_updated_at)}</td>
              <td className="max-w-md">{e.title}</td>
              <td>{e.categories?.name ?? '—'}</td>
              <td>{e.event_sources?.[0]?.count ?? 0}</td>
              <td>{e.importance_score}</td>
              <td>{e.trend_score}</td>
              <td>{e.articles?.[0]?.status ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
