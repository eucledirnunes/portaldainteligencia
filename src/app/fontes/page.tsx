import type { Metadata } from 'next';
import { EmptyState } from '@/components/ArticleCard';
import { getPublicSources } from '@/data/portal';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Fontes monitoradas',
  description: 'Lista pública das fontes que o portal monitora, com tipo de coleta e última verificação.',
  alternates: { canonical: '/fontes' },
};
export const revalidate = 120;

const TYPE: Record<string, string> = { rss: 'RSS', scraper: 'Coleta em página', api: 'API' };

export default async function Fontes() {
  const sources = await getPublicSources();
  const active = sources.filter((s) => s.active).length;
  return (
    <>
      <div className="mb-6 border-t-2 border-ink pt-3">
        <p className="kicker">Transparência</p>
        <h1 className="headline text-4xl">Fontes monitoradas</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Priorizamos fontes primárias (o próprio laboratório ou empresa) e usamos RSS sempre que existe. Não contornamos bloqueios, paywalls ou proteções anti-bot.
          {sources.length > 0 && <> Hoje são <strong>{active}</strong> fontes ativas de {sources.length} cadastradas.</>}
        </p>
      </div>
      {sources.length ? (
        <div className="panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-low font-mono text-[0.68rem] uppercase tracking-wider text-muted">
              <tr><th className="p-3">Fonte</th><th className="p-3">Classificação</th><th className="p-3">Coleta</th><th className="p-3">Confiabilidade</th><th className="p-3">Última verificação</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sources.map((s) => (
                <tr key={s.slug} className="hover:bg-low/50">
                  <td className="p-3"><a href={s.website_url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-accent">{s.name}</a></td>
                  <td className="p-3">{s.is_primary_source ? <span className="badge-primary">Primária</span> : <span className="badge-secondary">Secundária</span>}</td>
                  <td className="p-3 font-mono text-xs">{TYPE[s.source_type] ?? s.source_type}</td>
                  <td className="p-3 font-mono text-xs" aria-label={`${s.reliability_level} de 5`}>{'●'.repeat(s.reliability_level)}<span className="text-line">{'●'.repeat(5 - s.reliability_level)}</span></td>
                  <td className="whitespace-nowrap p-3 font-mono text-xs">{s.last_checked_at ? formatDateTime(s.last_checked_at) : 'nunca'}</td>
                  <td className="p-3">
                    {s.active
                      ? <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-okink"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-ok" />Ativa</span>
                      : <span className="font-mono text-xs text-muted">Em avaliação</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Lista de fontes indisponível." hint="Aplique a migration 0002_public_views.sql no Supabase." />
      )}
    </>
  );
}
