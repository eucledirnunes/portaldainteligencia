// Adaptado de ai-news-aggregator/src/utils/http.ts.
// Diferenças: User-Agent honesto (identifica o bot), sem spoof de navegador, sem retry em 403/404.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const USER_AGENT =
  process.env.INGEST_USER_AGENT || 'BlogDaInteligenciaBot/0.1 (+https://example.com/bot)';

const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  opts: { retries?: number; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<Response> {
  const { retries = 2, timeoutMs = 20_000, headers = {} } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...headers },
        signal: controller.signal,
        redirect: 'follow',
      });
      if (RETRY_STATUS.has(res.status) && attempt < retries) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastError = e;
    } finally {
      clearTimeout(t);
    }
    if (attempt < retries) await sleep(800 * (attempt + 1));
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

export async function fetchText(url: string, opts?: Parameters<typeof fetchWithRetry>[1]): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

const KNOWN_ENCODINGS = new Set(['utf-8', 'iso-8859-1', 'windows-1252', 'latin1']);

/** Detecta a codificação declarada (header Content-Type ou <?xml ... encoding="...">) em vez de assumir UTF-8. */
export function detectEncoding(bytes: Uint8Array, contentType: string | null): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? '')?.[1]?.toLowerCase();
  if (fromHeader && KNOWN_ENCODINGS.has(fromHeader)) return fromHeader;
  // Só os primeiros ~200 bytes interessam pro prólogo XML; ASCII-safe mesmo antes de decodificar.
  const prologue = Buffer.from(bytes.subarray(0, 200)).toString('ascii');
  const fromXml = /encoding=["']([\w-]+)["']/i.exec(prologue)?.[1]?.toLowerCase();
  if (fromXml && KNOWN_ENCODINGS.has(fromXml)) return fromXml;
  return 'utf-8';
}

/** Como fetchText, mas respeita a codificação declarada pelo feed (evita "Inova��o" em feeds ISO-8859-1). */
export async function fetchXmlText(url: string, opts?: Parameters<typeof fetchWithRetry>[1]): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const encoding = detectEncoding(bytes, res.headers.get('content-type'));
  return new TextDecoder(encoding).decode(bytes);
}
