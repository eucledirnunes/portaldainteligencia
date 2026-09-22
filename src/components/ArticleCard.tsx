import Link from 'next/link';
import type { ReactNode } from 'react';
import type { CardArticle } from '@/data/portal';
import { formatTime, timeAgo } from '@/lib/format';
import { LogoMark } from './Logo';

export function Thumb({ src, alt = '', className = '' }: { src: string | null; alt?: string; className?: string }) {
  if (!src) {
    // Sem capa (ex.: geração de imagem falhou): placeholder da marca. Nunca usamos fotos de terceiros.
    return (
      <div aria-hidden="true" className={`flex items-center justify-center bg-gradient-to-br from-navy via-navy to-accent/60 ${className}`}>
        <LogoMark size={40} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}

export function Kicker({ a }: { a: CardArticle }) {
  return a.category ? (
    <Link href={`/categoria/${a.category.slug}`} className="kicker hover:underline">{a.category.name}</Link>
  ) : (
    <span className="kicker">IA</span>
  );
}

function Meta({ a }: { a: CardArticle }) {
  return (
    <p className="meta">
      {a.source && <span className="font-medium text-ink/70">{a.source}</span>}
      {a.source && a.published_at && ' · '}
      {a.published_at && <time dateTime={a.published_at}>{timeAgo(a.published_at)}</time>}
    </p>
  );
}

/** Destaque principal (home). */
export function HeroCard({ a }: { a: CardArticle }) {
  return (
    <article className="group">
      <Link href={`/noticias/${a.slug}`} className="block overflow-hidden rounded-xl">
        <Thumb src={a.featured_image} alt={a.title} className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.02]" />
      </Link>
      <div className="mt-4 space-y-2">
        <Kicker a={a} />
        <h2 className="headline text-3xl sm:text-4xl">
          <Link href={`/noticias/${a.slug}`} className="card-link">{a.title}</Link>
        </h2>
        {a.summary && <p className="max-w-2xl text-base text-muted sm:text-lg">{a.summary}</p>}
        <Meta a={a} />
      </div>
    </article>
  );
}

/** Card vertical padrão (grids). */
export function ArticleCard({ a }: { a: CardArticle }) {
  return (
    <article className="group flex flex-col">
      <Link href={`/noticias/${a.slug}`} className="block overflow-hidden rounded-lg">
        <Thumb src={a.featured_image} alt={a.title} className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="mt-3 space-y-1.5">
        <Kicker a={a} />
        <h3 className="headline text-lg">
          <Link href={`/noticias/${a.slug}`} className="card-link">{a.title}</Link>
        </h3>
        {a.summary && <p className="line-clamp-2 text-sm text-muted">{a.summary}</p>}
        <Meta a={a} />
      </div>
    </article>
  );
}

/** Card horizontal compacto (destaques secundários e listas). */
export function CompactCard({ a }: { a: CardArticle }) {
  return (
    <article className="group grid grid-cols-[1fr_96px] gap-3 sm:grid-cols-[1fr_120px]">
      <div className="space-y-1">
        <Kicker a={a} />
        <h3 className="headline text-base sm:text-lg">
          <Link href={`/noticias/${a.slug}`} className="card-link">{a.title}</Link>
        </h3>
        <Meta a={a} />
      </div>
      <Link href={`/noticias/${a.slug}`} className="block self-start overflow-hidden rounded-md">
        <Thumb src={a.featured_image} className="aspect-square w-full" />
      </Link>
    </article>
  );
}

/** Linha do feed cronológico "Agora em IA". */
export function LiveRow({ a }: { a: CardArticle }) {
  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-3 border-b border-line py-3 last:border-0">
      <time dateTime={a.published_at ?? undefined} className="pt-0.5 text-sm font-semibold tabular-nums text-accent">{formatTime(a.published_at)}</time>
      <div>
        <Link href={`/noticias/${a.slug}`} className="card-link font-medium leading-snug">{a.title}</Link>
        {a.source && <p className="meta mt-0.5">{a.source}</p>}
      </div>
    </li>
  );
}

export function Section({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="section-title">
        <h2 className="headline text-2xl">{title}</h2>
        {href && <Link href={href} className="text-sm font-medium text-accent hover:underline">Ver tudo →</Link>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title = 'Ainda não há matérias por aqui.', hint }: { title?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <p className="headline text-xl">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Pagination({ base, page, hasNext }: { base: string; page: number; hasNext: boolean }) {
  const href = (p: number) => `${base}${base.includes('?') ? '&' : '?'}page=${p}`;
  if (page <= 1 && !hasNext) return null;
  return (
    <nav aria-label="Paginação" className="mt-10 flex justify-between text-sm font-medium">
      {page > 1 ? <Link href={href(page - 1)} className="text-accent hover:underline">← Mais novas</Link> : <span />}
      {hasNext && <Link href={href(page + 1)} className="text-accent hover:underline">Mais antigas →</Link>}
    </nav>
  );
}
