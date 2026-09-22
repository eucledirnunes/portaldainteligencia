import Image from 'next/image';
import Link from 'next/link';
import { ArticleCard, EmptyState, Kicker, LiveRow, Section, Thumb } from '@/components/ArticleCard';
import { ProvenanceStrip } from '@/components/Provenance';
import {
  getCategory, getCompanies, getFeed, getHourlyCounts, getPublicStats, getTrending, type CardArticle,
} from '@/data/portal';
import { formatClock, timeAgo } from '@/lib/format';

export const revalidate = 60;

async function sectionFeed(slug: string, limit = 1): Promise<CardArticle[]> {
  const cat = await getCategory(slug);
  return cat ? getFeed({ categoryId: cat.id, limit }) : [];
}

const SECTORS = [
  { slug: 'modelos-de-ia', label: 'Modelos' },
  { slug: 'negocios', label: 'Negócios' },
  { slug: 'ferramentas', label: 'Ferramentas' },
  { slug: 'ia-no-brasil', label: 'IA no Brasil' },
] as const;

export default async function Home() {
  const [latest, trending, stats, hourly, companies, ...sectors] = await Promise.all([
    getFeed({ limit: 40 }),
    getTrending(4),
    getPublicStats(),
    getHourlyCounts(6),
    getCompanies(),
    ...SECTORS.map((s) => sectionFeed(s.slug)),
  ]);

  if (!latest.length) {
    return (
      <EmptyState
        title="O portal está no ar, mas ainda não há matérias publicadas."
        hint="Rode a coleta (npm run pipeline) e publique os artigos em revisão pela área /admin."
      />
    );
  }

  // Destaque: o evento mais quente das últimas horas; senão, a matéria mais recente.
  const lead = [...latest.slice(0, 30)].sort((a, b) => b.trend - a.trend)[0] ?? latest[0];
  const more = latest.filter((a) => a.id !== lead.id).slice(0, 8);
  const maxHour = Math.max(1, ...hourly.map((h) => h.count));

  return (
    <>
      <Image
        src="/banner-hero.webp" alt="Blog da Inteligência" width={1710} height={667} priority
        className="mb-8 h-auto w-full rounded-lg object-cover"
      />

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Destaque principal */}
        <article className="flex flex-col gap-4 lg:col-span-8">
          <ProvenanceStrip a={lead} />
          <div className="space-y-2">
            <Kicker a={lead} />
            <h1 className="headline text-3xl sm:text-5xl">
              <Link href={`/noticias/${lead.slug}`} className="card-link">{lead.title}</Link>
            </h1>
            {lead.summary && <p className="font-serif text-lg leading-snug text-muted sm:text-xl">{lead.summary}</p>}
            <p className="meta">{formatClock(lead.published_at)} · {timeAgo(lead.published_at)}</p>
          </div>
          <Link href={`/noticias/${lead.slug}`} className="block overflow-hidden rounded-lg bg-navy">
            <Thumb src={lead.featured_image} alt={lead.title} className="aspect-[16/9] w-full" />
          </Link>
        </article>

        {/* Coluna direita: radar + bastidores */}
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <section className="panel p-4" aria-labelledby="radar">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="radar" className="text-sm font-bold uppercase tracking-wider">Radar de IA // Hoje</h2>
              <Link href="/radar" className="meta hover:text-accent">ver tudo →</Link>
            </div>
            {trending.length ? (
              <ol className="space-y-2">
                {trending.map((a, i) => (
                  <li key={a.id} className="rounded bg-low p-3 hover:bg-container">
                    <p className="font-mono text-[0.72rem] font-semibold text-accent">#{i + 1} · {a.sources.length || 1} {a.sources.length === 1 ? 'fonte' : 'fontes'}</p>
                    <Link href={`/noticias/${a.slug}`} className="card-link mt-0.5 block text-[0.92rem] font-semibold leading-snug">{a.title}</Link>
                    <p className="meta mt-1">{formatClock(a.published_at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Sem assuntos em alta no momento.</p>
            )}

            <div className="mt-3 rounded bg-container p-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted">Matérias publicadas por hora (últimas 6 h)</p>
              <div className="mt-2 flex h-14 items-end gap-1.5" role="img" aria-label={`Publicações por hora: ${hourly.map((h) => `${h.label}: ${h.count}`).join(', ')}`}>
                {hourly.map((h) => (
                  <div key={h.label} title={`${h.label}: ${h.count}`} style={{ height: `${Math.max(6, (h.count / maxHour) * 100)}%` }} className="w-full rounded-t bg-accent/70" />
                ))}
              </div>
              <div className="mt-1 flex justify-between font-mono text-[0.62rem] text-muted"><span>{hourly[0]?.label}</span><span>{hourly.at(-1)?.label} (agora)</span></div>
            </div>
          </section>

          {stats && (
            <section className="rounded-lg bg-ink p-4 text-white" aria-labelledby="bastidores">
              <h2 id="bastidores" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                <span aria-hidden="true" className="pip h-2 w-2 rounded-full bg-ok" />
                Bastidores da redação
              </h2>
              <p className="mt-1 text-xs leading-snug text-slate-300">Pipeline automatizado: coleta, agrupamento de fontes e publicação. Números das últimas 24 h.</p>
              <dl className="mt-3 space-y-1.5 font-mono text-[0.72rem]">
                {[
                  ['Coleta', `${stats.raw_24h} itens`],
                  ['Agrupamento', `${stats.events_24h} eventos`],
                  ['Publicação', `${stats.published_24h} matérias`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded bg-navy px-2.5 py-1.5"><dt className="text-slate-300">{k}</dt><dd className="font-bold text-ok">{v}</dd></div>
                ))}
              </dl>
            </section>
          )}
        </aside>
      </div>

      {/* Panorama por setor: última matéria de cada categoria */}
      {sectors.some((s) => s.length) && (
        <section className="mt-12 rounded-lg bg-surface p-5 sm:p-6" aria-labelledby="panorama">
          <div className="mb-4 flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
            <h2 id="panorama" className="headline text-2xl">Panorama por setor</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((sec, i) => {
              const a = sectors[i][0];
              if (!a) return null;
              return (
                <Link key={sec.slug} href={`/noticias/${a.slug}`} className="group flex flex-col justify-between rounded-lg bg-low p-4 hover:shadow-md">
                  <div>
                    <p className="flex justify-between text-[0.66rem] font-bold uppercase tracking-wider text-accent">
                      <span>{sec.label}</span><span className="font-mono font-normal text-muted">{timeAgo(a.published_at)}</span>
                    </p>
                    <h3 className="mt-2 text-[0.98rem] font-bold leading-snug group-hover:text-accent">{a.title}</h3>
                    {a.summary && <p className="mt-2 line-clamp-3 text-[0.82rem] text-muted">{a.summary}</p>}
                  </div>
                  <p className="mt-4 flex justify-between font-mono text-[0.68rem] text-muted"><span>{a.sources.length || 1} {a.sources.length === 1 ? 'fonte' : 'fontes'}</span><span aria-hidden="true">→</span></p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="agora">
          <div className="section-title">
            <h2 id="agora" className="headline text-2xl">Agora em IA</h2>
            <Link href="/ultimas" className="text-sm font-medium text-accent hover:underline">Ver tudo →</Link>
          </div>
          <ul>{latest.slice(0, 10).map((a) => <LiveRow key={a.id} a={a} />)}</ul>
        </section>

        {companies.length > 0 && (
          <section aria-labelledby="empresas">
            <div className="section-title">
              <h2 id="empresas" className="headline text-2xl">Empresas</h2>
              <Link href="/empresas" className="text-sm font-medium text-accent hover:underline">Ver todas →</Link>
            </div>
            <ul className="flex flex-wrap gap-2">
              {companies.map((c) => (
                <li key={c.id}><Link href={`/empresas/${c.slug}`} className="inline-block rounded-full border border-line bg-surface px-3.5 py-1 text-sm font-medium hover:border-accent hover:text-accent">{c.name}</Link></li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {more.length > 0 && (
        <Section title="Mais recentes" href="/ultimas">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{more.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        </Section>
      )}
    </>
  );
}
