import { createServiceClient } from '@/lib/supabase/clients';
import { formatDateTime } from '@/lib/format';
import type { SourceRow } from '@/domain/types';
import { toggleSource } from '../actions';

export default async function AdminSources() {
  const { data, error } = await createServiceClient().from('sources').select('*').order('is_primary_source', { ascending: false }).order('name');
  if (error) return <p>{error.message}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="meta border-b border-line"><tr><th className="p-3">Fonte</th><th>Tipo</th><th>Primária</th><th>Conf.</th><th>Última coleta</th><th>Nota</th><th>Ativa</th></tr></thead>
        <tbody>
          {(data as SourceRow[]).map((s) => (
            <tr key={s.id} className="border-b border-line last:border-0">
              <td className="p-3"><a href={s.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">{s.name}</a></td>
              <td>{s.source_type}</td>
              <td>{s.is_primary_source ? 'Sim' : '—'}</td>
              <td>{s.reliability_level}/5</td>
              <td className="whitespace-nowrap">{s.last_checked_at ? formatDateTime(s.last_checked_at) : 'nunca'}</td>
              <td className="max-w-xs truncate text-muted" title={s.config?.note}>{s.config?.note}</td>
              <td>
                <form action={toggleSource}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={String(!s.active)} />
                  <button className={`rounded-full px-3 py-1 text-xs font-semibold ${s.active ? 'bg-accent/15 text-accent' : 'bg-line text-muted'}`}>{s.active ? 'Ativa' : 'Inativa'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
