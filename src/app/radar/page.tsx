import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ArticleCard';
import { getTrending } from '@/data/portal';
import { formatClock, timeAgo } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Radar: assuntos em alta em IA',
  description: 'Acontecimentos com mais fontes e atividade recente sobre Inteligência Artificial.',
  alternates: { canonical: '/radar' },
};
export const revalidate = 60;

export default async function Radar() {
  const items = await getTrending(12);
  return (
    <>
      <div className="mb-6 border-t-2 border-ink pt-3">
        <p className="kicker">Radar</p>
        <h1 className="headline text-4xl">Assuntos em alta</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Acontecimentos ordenados por atividade recente: quanto mais fontes confiáveis cobrem e quanto mais nova a cobertura, mais alto o assunto sobe.
          Janela de 72 horas.
        </p>
      </div>
      {items.length ? (
        <ol className="grid gap-4 md:grid-cols-2">
          {items.map((a, i) => (
            <li key={a.id} className="panel relative overflow-hidden p-5">
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${i === 0 ? 'bg-alert' : i < 3 ? 'bg-accent' : 'bg-ok'}`} />
              <div className="flex items-center justify-between font-mono text-[0.7rem]">
                <span className="rounded bg-low px-2 py-0.5 font-bold text-accent">#{i + 1}</span>
                <span className="text-muted">{a.sources.length || 1} {a.sources.length === 1 ? 'fonte' : 'fontes'} · {timeAgo(a.published_at)}</span>
              </div>
              <h2 className="headline mt-3 text-xl">
                <Link href={`/noticias/${a.slug}`} className="card-link">{a.title}</Link>
              </h2>
              {a.summary && <p className="mt-2 line-clamp-3 text-sm text-muted">{a.summary}</p>}
              {a.sources.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {a.sources.map((s) => (
                    <li key={s.name} className={s.isPrimary ? 'badge-primary' : 'badge-secondary'}>{s.name}</li>
                  ))}
                </ul>
              )}
              <p className="meta mt-3">1º registro: {formatClock(a.published_at)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="Sem assuntos em alta nas últimas 72 horas." />
      )}
    </>
  );
}
