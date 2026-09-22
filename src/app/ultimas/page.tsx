import type { Metadata } from 'next';
import { ArticleCard, EmptyState, Pagination } from '@/components/ArticleCard';
import { getFeed } from '@/data/portal';

export const metadata: Metadata = { title: 'Últimas notícias de IA', alternates: { canonical: '/ultimas' } };

const PAGE_SIZE = 24;

export default async function Ultimas({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const items = await getFeed({ limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  return (
    <>
      <h1 className="headline mb-6 border-t-2 border-ink pt-3 text-4xl">Últimas</h1>
      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{items.slice(0, PAGE_SIZE).map((a) => <ArticleCard key={a.id} a={a} />)}</div>
      ) : (
        <EmptyState />
      )}
      <Pagination base="/ultimas" page={page} hasNext={items.length > PAGE_SIZE} />
    </>
  );
}
