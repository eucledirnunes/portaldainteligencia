import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard, EmptyState, Section } from '@/components/ArticleCard';
import { getCategory, getFeed, getModels } from '@/data/portal';

export const metadata: Metadata = { title: 'Modelos de IA', alternates: { canonical: '/modelos' } };
export const revalidate = 120;

export default async function Modelos() {
  const [models, cat] = await Promise.all([getModels(), getCategory('modelos-de-ia')]);
  const news = cat ? await getFeed({ categoryId: cat.id, limit: 8 }) : [];
  return (
    <>
      <h1 className="headline mb-6 border-t-2 border-ink pt-3 text-4xl">Modelos</h1>
      {models.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <li key={m.id}>
              <Link href={`/modelos/${m.slug}`} className="block h-full rounded-xl border border-line bg-surface p-5 hover:border-accent">
                {m.company && <p className="kicker">{m.company.name}</p>}
                <p className="headline mt-1 text-xl">{m.name}</p>
                {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhum modelo cadastrado." />
      )}
      {news.length > 0 && (
        <Section title="Notícias sobre modelos" href="/categoria/modelos-de-ia">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{news.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        </Section>
      )}
    </>
  );
}
