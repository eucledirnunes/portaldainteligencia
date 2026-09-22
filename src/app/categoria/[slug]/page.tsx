import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleCard, EmptyState, Pagination } from '@/components/ArticleCard';
import { getCategory, getFeed } from '@/data/portal';

const PAGE_SIZE = 24;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await getCategory((await params).slug);
  return cat ? { title: cat.name, description: cat.description ?? undefined, alternates: { canonical: `/categoria/${cat.slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const items = await getFeed({ categoryId: cat.id, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
  return (
    <>
      <div className="mb-6 border-t-2 border-ink pt-3">
        <h1 className="headline text-4xl">{cat.name}</h1>
        {cat.description && <p className="mt-1 text-muted">{cat.description}</p>}
      </div>
      {items.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{items.slice(0, PAGE_SIZE).map((a) => <ArticleCard key={a.id} a={a} />)}</div>
      ) : (
        <EmptyState />
      )}
      <Pagination base={`/categoria/${cat.slug}`} page={page} hasNext={items.length > PAGE_SIZE} />
    </>
  );
}
