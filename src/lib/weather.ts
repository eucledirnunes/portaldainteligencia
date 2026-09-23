/**
 * Clima via OpenWeather (plano gratuito: 60 chamadas/min, 1M/mês). Uma cidade fixa,
 * cacheada por REVALIDATE_SECONDS — nunca uma chamada por visitante.
 */
const REVALIDATE_SECONDS = 30 * 60; // 30 min: clima muda devagar, ~48 chamadas/dia
const CITY = 'São Paulo,BR';

export interface WeatherNow {
  city: string;
  tempC: number;
  description: string;
  icon: string; // código OpenWeather, ex. "01d"
}

interface OpenWeatherResponse {
  cod?: number | string;
  message?: string;
  name?: string;
  main?: { temp?: number };
  weather?: { description?: string; icon?: string }[];
}

/** Emoji simples a partir do código de ícone do OpenWeather (2 primeiros dígitos = condição). */
export function weatherEmoji(icon: string): string {
  const group = icon.slice(0, 2);
  const map: Record<string, string> = {
    '01': '☀️', '02': '⛅', '03': '☁️', '04': '☁️',
    '09': '🌧️', '10': '🌦️', '11': '⛈️', '13': '❄️', '50': '🌫️',
  };
  return map[group] ?? '🌡️';
}

/** Busca o clima atual da cidade fixa. Retorna null se a chave não estiver configurada ou a API falhar (nunca lança). */
export async function getWeatherNow(): Promise<WeatherNow | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(CITY)}&units=metric&lang=pt_br&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    const json = (await res.json()) as OpenWeatherResponse;

    if (String(json.cod) !== '200' || json.main?.temp === undefined) {
      console.error(`getWeatherNow: OpenWeather respondeu erro: ${json.message ?? json.cod}`);
      return null;
    }

    const w = json.weather?.[0];
    return {
      city: json.name ?? 'São Paulo',
      tempC: Math.round(json.main.temp),
      description: w?.description ?? '',
      icon: w?.icon ?? '01d',
    };
  } catch (e) {
    console.error(`getWeatherNow: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}
