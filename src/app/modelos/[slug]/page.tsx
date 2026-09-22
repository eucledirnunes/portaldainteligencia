import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard, EmptyState } from '@/components/ArticleCard';
import { getModel } from '@/data/portal';
import { formatDate } from '@/lib/format';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getModel((await params).slug);
  return data ? { title: `${data.model.name}: notícias e informações`, description: data.model.description ?? undefined, alternates: { canonical: `/modelos/${data.model.slug}` } } : {};
}

// Campos futuros (context window, preço de API, benchmarks, modalidades, histórico) vêm de models.metadata.
const SPEC_FIELDS: { key: string; label: string }[] = [
  { key: 'context_window', label: 'Janela de contexto' },
  { key: 'api_price', label: 'Preço da API' },
  { key: 'modalities', label: 'Modalidades' },
];

export default async function ModelPage({ params }: Props) {
  const data = await getModel((await params).slug);
  if (!data) notFound();
  const { model, company, news } = data;
  const specs = SPEC_FIELDS.filter((f) => model.metadata?.[f.key] != null);

  return (
    <>
      <header className="border-t-2 border-ink pt-5">
        {company && <Link href={`/empresas/${company.slug}`} className="kicker hover:underline">{company.name}</Link>}
        <h1 className="headline mt-1 text-4xl">{model.name}</h1>
        {model.description && <p className="mt-2 max-w-2xl text-muted">{model.description}</p>}
      </header>

      <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-5 text-sm sm:grid-cols-3">
        <div><dt className="meta">Empresa</dt><dd className="font-medium">{company?.name ?? '—'}</dd></div>
        <div><dt className="meta">Status</dt><dd className="font-medium capitalize">{model.status === 'active' ? 'Ativo' : model.status === 'deprecated' ? 'Descontinuado' : 'Anunciado'}</dd></div>
        <div><dt className="meta">Lançamento</dt><dd className="font-medium">{model.release_date ? formatDate(model.release_date) : '—'}</dd></div>
        {specs.map((f) => (
          <div key={f.key}><dt className="meta">{f.label}</dt><dd className="font-medium">{String(model.metadata[f.key])}</dd></div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="section-title headline text-2xl">Notícias relacionadas</h2>
        {news.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{news.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
        ) : (
          <EmptyState title={`Ainda não há notícias sobre ${model.name}.`} />
        )}
      </section>
    </>
  );
}
