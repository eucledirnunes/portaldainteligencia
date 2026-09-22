import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard, EmptyState } from '@/components/ArticleCard';
import { getCompany } from '@/data/portal';
import { formatDate } from '@/lib/format';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCompany((await params).slug);
  return data ? { title: `${data.company.name}: notícias e modelos`, description: data.company.description ?? undefined, alternates: { canonical: `/empresas/${data.company.slug}` } } : {};
}

export default async function CompanyPage({ params }: Props) {
  const data = await getCompany((await params).slug);
  if (!data) notFound();
  const { company, models, news } = data;
  return (
    <>
      <header className="flex flex-wrap items-start gap-5 border-t-2 border-ink pt-5">
        {company.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt={`Logo ${company.name}`} width={72} height={72} className="h-[72px] w-[72px] rounded-xl border border-line bg-surface object-contain p-2" />
        ) : (
          <div aria-hidden="true" className="flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-accent/10 font-serif text-3xl font-semibold text-accent">{company.name[0]}</div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="headline text-4xl">{company.name}</h1>
          {company.description && <p className="mt-1 max-w-2xl text-muted">{company.description}</p>}
          {company.website_url && (
            <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">Site oficial ↗</a>
          )}
        </div>
      </header>

      {models.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title headline text-2xl">Modelos</h2>
          <ul className="flex flex-wrap gap-3">
            {models.map((m) => (
              <li key={m.id}>
                <Link href={`/modelos/${m.slug}`} className="block rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent">
                  <span className="font-semibold">{m.name}</span>
                  {m.description && <span className="block max-w-xs text-xs text-muted">{m.description}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="section-title headline text-2xl">Últimas notícias</h2>
        {news.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{news.slice(0, 8).map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        ) : (
          <EmptyState title={`Ainda não há notícias sobre ${company.name}.`} />
        )}
      </section>

      {news.length > 8 && (
        <section className="mt-10" aria-labelledby="timeline">
          <h2 id="timeline" className="section-title headline text-2xl">Linha do tempo</h2>
          <ol className="relative ml-2 space-y-5 border-l border-line pl-6">
            {news.map((a) => (
              <li key={a.id} className="relative">
                <span aria-hidden="true" className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <time dateTime={a.published_at ?? undefined} className="meta">{formatDate(a.published_at)}</time>
                <Link href={`/noticias/${a.slug}`} className="card-link block font-medium leading-snug">{a.title}</Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
