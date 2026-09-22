import Link from 'next/link';
import { getFeed } from '@/data/portal';
import { formatClock } from '@/lib/format';
import { NAV } from '@/lib/site';
import { Logo } from './Logo';
import { MarketTicker } from './MarketTicker';

/** Faixa escura "AGORA EM IA" com a matéria publicada mais recente. */
async function NowBar() {
  const [latest] = await getFeed({ limit: 1 });
  if (!latest) return null;
  return (
    <div className="bg-navy px-4 py-1.5 text-white sm:px-6">
      <div className="mx-auto flex max-w-page items-center gap-3 font-mono text-[0.72rem]">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-alert px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider">
          <span aria-hidden="true" className="pip h-1.5 w-1.5 rounded-full bg-white" />
          Agora em IA
        </span>
        <span className="shrink-0 text-slate-400">{formatClock(latest.published_at)}</span>
        <Link href={`/noticias/${latest.slug}`} className="truncate font-sans text-[0.8rem] text-white hover:underline">
          {latest.title}
        </Link>
      </div>
    </div>
  );
}

export async function Header() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-surface/95 shadow-[0_1px_8px_rgba(10,14,23,0.05)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-page items-center gap-4 px-4 sm:px-6">
          <Logo />
          <form action="/busca" role="search" className="mx-4 hidden max-w-md flex-1 lg:block">
            <label htmlFor="q" className="sr-only">Buscar</label>
            <input
              id="q" name="q" type="search" minLength={2} autoComplete="off"
              placeholder="Buscar eventos, modelos ou empresas..."
              className="w-full rounded bg-low px-3 py-2 text-sm placeholder:text-outline focus:outline-accent"
            />
          </form>
          <Link href="/busca" className="ml-auto rounded bg-low px-3 py-1.5 text-xs font-semibold uppercase tracking-wider lg:hidden">Buscar</Link>
          <Link href="/fontes" className="hidden rounded bg-container px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-high lg:inline-block">
            Status das fontes
          </Link>
        </div>
        <nav aria-label="Principal" className="border-t border-line">
          <ul className="mx-auto flex max-w-page items-center gap-6 overflow-x-auto whitespace-nowrap px-4 py-2 text-[0.95rem] font-semibold sm:px-6">
            {NAV.map((i) => (
              <li key={i.href}><Link href={i.href} className="text-muted hover:text-ink">{i.label}</Link></li>
            ))}
          </ul>
        </nav>
      </header>
      <NowBar />
      <MarketTicker />
    </>
  );
}
