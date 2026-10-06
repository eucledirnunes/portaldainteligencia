import { formatMarketChange, formatMarketPrice, getMarketQuotes, type MarketQuote } from '@/lib/market';
import { getWeatherNow, weatherEmoji } from '@/lib/weather';

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

function WeatherItem({ w }: { w: NonNullable<Awaited<ReturnType<typeof getWeatherNow>>> }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span aria-hidden="true">{weatherEmoji(w.icon)}</span>
      <span className="text-slate-400">{w.city}</span>
      <span className="font-semibold text-white">{w.tempC}°C</span>
      <span className="capitalize text-slate-400">{w.description}</span>
    </span>
  );
}

/**
 * Faixa com o clima fixo à esquerda e cotações em looping contínuo (estilo "ticker" de TV). As cotações são duplicadas e a
 * faixa desliza -50% num loop infinito; em prefers-reduced-motion a animação para e a faixa vira uma
 * lista normal, navegável por scroll horizontal. Some inteiramente se nada estiver configurado.
 */
export async function MarketTicker() {
  const [quotes, weather] = await Promise.all([getMarketQuotes(), getWeatherNow()]);
  if (!quotes.length && !weather) return null;

  const row = (keyPrefix: string) => (
    <div className="flex shrink-0" aria-hidden={keyPrefix === 'dup' || undefined}>
      {quotes.map((q) => <Item key={`${keyPrefix}-${q.symbol}`} q={q} />)}
    </div>
  );

  // Clima fixo à esquerda; só as cotações rolam.
  return (
    <div className="flex items-center border-t border-line bg-navy font-mono text-[0.68rem]" aria-label="Clima e cotações de mercado">
      {weather && (
        <div className="z-10 shrink-0 border-r border-white/10 bg-navy py-1.5 pl-4 pr-3 sm:pl-6">
          <WeatherItem w={weather} />
        </div>
      )}
      {quotes.length > 0 && (
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto py-1.5 pl-3 pr-4 sm:pr-6">
          <div className="marquee-track flex w-max">
            {row('main')}
            {row('dup')}
          </div>
        </div>
      )}
    </div>
  );
}
