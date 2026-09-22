import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard, EmptyState } from '@/components/ArticleCard';
import { search } from '@/data/portal';

export const metadata: Metadata = { title: 'Busca', robots: { index: false } };

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? '').trim();
  const r = await search(q);
  const total = r.articles.length + r.companies.length + r.models.length;
  return (
    <>
      <h1 className="headline mb-4 border-t-2 border-ink pt-3 text-4xl">Busca</h1>
      <form action="/busca" role="search" className="mb-8 flex max-w-xl gap-2">
        <label htmlFor="bq" className="sr-only">Termo de busca</label>
        <input id="bq" name="q" type="search" defaultValue={q} minLength={2} placeholder="Ex.: OpenAI, Claude, agentes" className="flex-1 rounded-full border border-line bg-surface px-4 py-2 focus:border-accent" />
        <button className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-bg">Buscar</button>
      </form>

      {q.length < 2 ? (
        <p className="text-muted">Digite ao menos 2 caracteres.</p>
      ) : total === 0 ? (
        <EmptyState title={`Nada encontrado para “${q}”.`} hint="Tente outro termo ou o nome de uma empresa ou modelo." />
      ) : (
        <>
          {(r.companies.length > 0 || r.models.length > 0) && (
            <ul className="mb-8 flex flex-wrap gap-2">
              {r.companies.map((c) => <li key={c.id}><Link href={`/empresas/${c.slug}`} className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-medium hover:border-accent">Empresa · {c.name}</Link></li>)}
              {r.models.map((m) => <li key={m.id}><Link href={`/modelos/${m.slug}`} className="rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent">Modelo · {m.name}</Link></li>)}
            </ul>
          )}
          {r.articles.length > 0 && <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{r.articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>}
        </>
      )}
    </>
  );
}
