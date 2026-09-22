/**
 * Cotações via Twelve Data (plano gratuito: 8 créditos/min, 800/dia). Uma única chamada
 * combinando todos os ativos, cacheada por REVALIDATE_SECONDS — nunca uma chamada por visitante,
 * o que manteria o site bem dentro do limite por minuto mesmo em tráfego alto.
 */
const REVALIDATE_SECONDS = 20 * 60; // 20 min: ~72 chamadas/dia no pior caso, bem abaixo de 800/dia

export interface MarketAsset {
  symbol: string;
  label: string;
  kind: 'stock' | 'forex' | 'metal';
}

export const MARKET_ASSETS: MarketAsset[] = [
  { symbol: 'USD/BRL', label: 'Dólar', kind: 'forex' },
  { symbol: 'EUR/BRL', label: 'Euro', kind: 'forex' },
  { symbol: 'XAU/USD', label: 'Ouro (oz)', kind: 'metal' },
  { symbol: 'NVDA', label: 'NVIDIA', kind: 'stock' },
  { symbol: 'MSFT', label: 'Microsoft', kind: 'stock' },
  { symbol: 'GOOGL', label: 'Alphabet', kind: 'stock' },
  { symbol: 'META', label: 'Meta', kind: 'stock' },
  { symbol: 'AMD', label: 'AMD', kind: 'stock' },
];

export interface MarketQuote extends MarketAsset {
  price: number;
  changePercent: number;
  currency: string;
}

interface TwelveDataQuote {
  symbol?: string;
  close?: string;
  percent_change?: string;
  currency?: string;
  status?: string;
  code?: number;
  message?: string;
}

function parseQuote(asset: MarketAsset, raw: TwelveDataQuote | undefined): MarketQuote | null {
  if (!raw || raw.status === 'error' || raw.close === undefined) return null;
  const price = Number(raw.close);
  const changePercent = Number(raw.percent_change ?? 0);
  if (!Number.isFinite(price)) return null;
  return { ...asset, price, changePercent: Number.isFinite(changePercent) ? changePercent : 0, currency: raw.currency ?? (asset.kind === 'stock' ? 'USD' : '') };
}

/** Busca todas as cotações numa única chamada. Retorna [] se a chave não estiver configurada ou a API falhar (nunca lança). */
export async function getMarketQuotes(): Promise<MarketQuote[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return [];

  try {
    const symbols = MARKET_ASSETS.map((a) => a.symbol).join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    const json = await res.json();

    if (json?.status === 'error') {
      console.error(`getMarketQuotes: Twelve Data respondeu erro: ${json.message}`);
      return [];
    }

    // Resposta é um objeto por símbolo quando >1 ativo é pedido; achatada (flat) quando é só 1.
    const bySymbol: Record<string, TwelveDataQuote> = MARKET_ASSETS.length === 1 ? { [MARKET_ASSETS[0].symbol]: json } : json;

    return MARKET_ASSETS.map((asset) => parseQuote(asset, bySymbol[asset.symbol])).filter((q): q is MarketQuote => q !== null);
  } catch (e) {
    console.error(`getMarketQuotes: ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

/** Formata preço conforme o tipo de ativo (câmbio com 4 casas, ações/ouro com 2). */
export function formatMarketPrice(q: MarketQuote): string {
  const decimals = q.kind === 'forex' ? 4 : 2;
  const prefix = q.kind === 'stock' || q.kind === 'metal' ? '$' : 'R$ ';
  return `${prefix}${q.price.toFixed(decimals)}`;
}

export function formatMarketChange(q: MarketQuote): string {
  const sign = q.changePercent > 0 ? '+' : '';
  return `${sign}${q.changePercent.toFixed(2)}%`;
}
