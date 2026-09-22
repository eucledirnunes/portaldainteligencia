import { formatMarketChange, formatMarketPrice, getMarketQuotes } from '@/lib/market';

/** Faixa compacta de cotações (câmbio, ouro e ações de empresas ligadas a IA). Some se a API não estiver configurada. */
export async function MarketTicker() {
  const quotes = await getMarketQuotes();
  if (!quotes.length) return null;

  return (
    <div className="border-t border-line bg-navy px-4 py-1 sm:px-6" aria-label="Cotações de mercado">
      <div className="mx-auto flex max-w-page items-center gap-4 overflow-x-auto whitespace-nowrap font-mono text-[0.68rem] text-slate-300">
        {quotes.map((q) => {
          const up = q.changePercent >= 0;
          return (
            <span key={q.symbol} className="inline-flex shrink-0 items-center gap-1.5">
              <span className="text-slate-400">{q.label}</span>
              <span className="font-semibold text-white">{formatMarketPrice(q)}</span>
              <span className={up ? 'text-ok' : 'text-rose-400'}>{up ? '▲' : '▼'} {formatMarketChange(q)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
