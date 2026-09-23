import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleBody } from '@/components/ArticleBody';
import { CompactCard, Thumb } from '@/components/ArticleCard';
import { getArticle, getRelated } from '@/data/portal';
import { formatDate, formatDateTime } from '@/lib/format';
import { SITE } from '@/lib/site';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  const title = a.seo_title || a.title;
  const description = a.seo_description || a.summary || undefined;
  const img = a.featured_image;
  return {
    title,
    description,
    alternates: { canonical: `/noticias/${a.slug}` },
    openGraph: {
      type: 'article', title, description, publishedTime: a.published_at ?? undefined, modifiedTime: a.updated_at,
      images: img ? [img] : undefined,
    },
    twitter: { card: img ? 'summary_large_image' : 'summary' },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const related = await getRelated(a);
  const updated = a.published_at && new Date(a.updated_at).getTime() - new Date(a.published_at).getTime() > 3_600_000;
  const n = a.sourceLinks.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.summary ?? undefined,
    image: a.featured_image ? [a.featured_image] : undefined,
    datePublished: a.published_at,
    dateModified: a.updated_at,
    mainEntityOfPage: `${SITE.url}/noticias/${a.slug}`,
    publisher: { '@type': 'Organization', name: SITE.name },
    citation: a.sourceLinks.map((s) => s.url),
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <header className="max-w-4xl">
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-low px-3 py-2">
          {a.category && (
            <Link href={`/categoria/${a.category.slug}`} className="rounded bg-ink px-2 py-0.5 font-mono text-[0.66rem] font-semibold uppercase tracking-wider text-white">{a.category.name}</Link>
          )}
          <span className="chip text-accent">{n} {n === 1 ? 'fonte' : 'fontes cruzadas'}</span>
          <span className="meta">
            Publicado <time dateTime={a.published_at ?? undefined}>{formatDateTime(a.published_at)}</time>
            {updated && <> · Atualizado <time dateTime={a.updated_at}>{formatDateTime(a.updated_at)}</time></>}
          </span>
        </div>
        <h1 className="headline text-4xl sm:text-5xl">{a.title}</h1>
        {a.subtitle && <p className="mt-3 font-serif text-xl text-muted">{a.subtitle}</p>}
        <p className="mt-3 text-sm font-medium text-ink/80">Por {a.author.name} — {a.author.role}</p>
        {n > 0 && (
          <p className="mt-1 text-sm text-muted">
            Com informações de {[...new Set(a.sourceLinks.map((s) => s.source_name))].join(', ')}.{' '}
            {a.generated_by !== 'human' && a.generated_by !== 'basic' && <span>Texto produzido com apoio de inteligência artificial a partir das fontes listadas ao final.</span>}
          </p>
        )}
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {a.featured_image && (
            <figure className="mb-8">
              <Thumb src={a.featured_image} alt={a.title} className="aspect-[16/9] w-full rounded-lg" />
              <figcaption className="mt-1.5 font-mono text-[0.65rem] uppercase tracking-wide text-muted">Ilustração gerada por IA</figcaption>
            </figure>
          )}
          {a.summary && <p className="mb-6 border-l-4 border-accent pl-4 font-serif text-xl leading-snug">{a.summary}</p>}
          <ArticleBody content={a.content} />

          <section aria-labelledby="fontes" className="mt-10 rounded-lg bg-low p-5">
            <h2 id="fontes" className="text-sm font-bold uppercase tracking-wider">Fontes utilizadas</h2>
            <p className="mt-1 text-xs text-muted">Links para o conteúdo original. Confira sempre a fonte primária.</p>
            {n ? (
              <ul className="mt-4 space-y-2">
                {a.sourceLinks.map((s) => (
                  <li key={s.url} className="rounded bg-surface p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {s.is_primary_source ? (
                        <span className="badge-primary"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />Fonte primária</span>
                      ) : (
                        <span className="badge-secondary"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-slate-400" />Secundária</span>
                      )}
                      {s.published_at && <span className="meta">{formatDate(s.published_at)}</span>}
                    </div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-accent hover:underline">{s.source_name} ↗</a>
                    <p className="text-sm text-ink/80">{s.original_title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Fontes indisponíveis para esta matéria.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          {(a.companies.length > 0 || a.models.length > 0) && (
            <section className="panel p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Neste assunto</h2>
              <ul className="space-y-1.5 text-sm">
                {a.companies.map((c) => (
                  <li key={c.id} className="flex justify-between rounded bg-low px-3 py-2"><span className="text-muted">Empresa</span><Link href={`/empresas/${c.slug}`} className="font-semibold hover:text-accent">{c.name}</Link></li>
                ))}
                {a.models.map((m) => (
                  <li key={m.id} className="flex justify-between rounded bg-low px-3 py-2"><span className="text-muted">Modelo</span><Link href={`/modelos/${m.slug}`} className="font-semibold hover:text-accent">{m.name}</Link></li>
                ))}
              </ul>
            </section>
          )}
          {related.length > 0 && (
            <section className="panel p-4">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Relacionadas</h2>
              <div className="space-y-4">{related.map((r) => <CompactCard key={r.id} a={r} />)}</div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
