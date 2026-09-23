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
    <span className="inline-flex shrink-0 items-center gap-1.5 pr-6">
      <span aria-hidden="true">{weatherEmoji(w.icon)}</span>
      <span className="text-slate-400">{w.city}</span>
      <span className="font-semibold text-white">{w.tempC}°C</span>
      <span className="capitalize text-slate-400">{w.description}</span>
    </span>
  );
}

/**
 * Faixa de cotações + clima em looping contínuo (estilo "ticker" de TV). O conteúdo é duplicado e a
 * faixa desliza -50% num loop infinito; em prefers-reduced-motion a animação para e a faixa vira uma
 * lista normal, navegável por scroll horizontal. Some inteiramente se nada estiver configurado.
 */
export async function MarketTicker() {
  const [quotes, weather] = await Promise.all([getMarketQuotes(), getWeatherNow()]);
  if (!quotes.length && !weather) return null;

  const row = (keyPrefix: string) => (
    <div className="flex shrink-0" aria-hidden={keyPrefix === 'dup' || undefined}>
      {weather && <WeatherItem key={`${keyPrefix}-weather`} w={weather} />}
      {quotes.map((q) => <Item key={`${keyPrefix}-${q.symbol}`} q={q} />)}
    </div>
  );

  return (
    <div className="no-scrollbar overflow-x-auto border-t border-line bg-navy px-4 py-1.5 sm:px-6" aria-label="Clima e cotações de mercado">
      <div className="marquee-track flex w-max font-mono text-[0.68rem]">
        {row('main')}
        {row('dup')}
      </div>
    </div>
  );
}
