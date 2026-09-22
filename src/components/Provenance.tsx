import type { CardArticle } from '@/data/portal';

/** Faixa de proveniência: quantas fontes cobrem o evento e quais são primárias. Só dados reais. */
export function ProvenanceStrip({ a }: { a: Pick<CardArticle, 'sources'> }) {
  const primary = a.sources.filter((s) => s.isPrimary);
  const secondary = a.sources.filter((s) => !s.isPrimary);
  if (!a.sources.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-low p-2 text-[0.72rem]">
      <span className="chip text-accent">
        {a.sources.length} {a.sources.length === 1 ? 'fonte' : 'fontes cruzadas'}
      </span>
      {primary.length > 0 && (
        <span className="badge-primary">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ok" />
          Primária: {primary.map((s) => s.name).join(', ')}
        </span>
      )}
      {secondary.length > 0 && (
        <span className="text-muted">
          {secondary.length === 1 ? 'Secundária' : 'Secundárias'}: {secondary.map((s) => s.name).join(', ')}
        </span>
      )}
    </div>
  );
}
