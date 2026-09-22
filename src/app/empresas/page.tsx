import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState } from '@/components/ArticleCard';
import { getCompanies } from '@/data/portal';

export const metadata: Metadata = { title: 'Empresas de IA', alternates: { canonical: '/empresas' } };
export const revalidate = 300;

export default async function Empresas() {
  const companies = await getCompanies();
  return (
    <>
      <h1 className="headline mb-6 border-t-2 border-ink pt-3 text-4xl">Empresas</h1>
      {companies.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id}>
              <Link href={`/empresas/${c.slug}`} className="block h-full rounded-xl border border-line bg-surface p-5 hover:border-accent">
                <p className="headline text-xl">{c.name}</p>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nenhuma empresa cadastrada." />
      )}
    </>
  );
}
