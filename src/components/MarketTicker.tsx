import { formatMarketChange, formatMarketPrice, getMarketQuotes, type MarketQuote } from '@/lib/market';

function Item({ q }: { q: MarketQuote }) {
  const up = q.changePercent >= 0;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 pr-6">
      <span className="text-slate-400">{q.label}</span>
      <span className="font-semibold text-white">{formatMarketPrice(q)}</span>
      <span className={up ? 'text-ok' : 'text-rose-400'}>{up ? '▲' : '▼'} {formatMarketChange(q)}</span>
    </span>
  );
}

/**
 * Faixa de cotações em looping contínuo (estilo "ticker" de TV). O conteúdo é duplicado e a faixa
 * desliza -50% num loop infinito; em prefers-reduced-motion a animação para e a faixa vira uma
 * lista normal, navegável por scroll horizontal. Some inteiramente se a API não estiver configurada.
 */
export async function MarketTicker() {
  const quotes = await getMarketQuotes();
  if (!quotes.length) return null;

  return (
    <div className="overflow-x-auto border-t border-line bg-navy px-4 py-1.5 sm:px-6" aria-label="Cotações de mercado">
      <div className="marquee-track flex w-max font-mono text-[0.68rem]">
        <div className="flex shrink-0">{quotes.map((q) => <Item key={q.symbol} q={q} />)}</div>
        <div className="flex shrink-0" aria-hidden="true">{quotes.map((q) => <Item key={`dup-${q.symbol}`} q={q} />)}</div>
      </div>
    </div>
  );
}
