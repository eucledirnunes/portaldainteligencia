// Adaptado de ai-news-aggregator/src/utils/url.ts (normalização) + canonicalização para dedupe.
const TRACKING_PARAMS = new Set([
  'ref', 'spm', 'fbclid', 'gclid', 'igshid', 'mkt_tok', 'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'source', 'cmpid',
]);

/** Remove tracking params, hash, "www.", barra final; força https. Nunca lança. */
export function canonicalizeUrl(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:') url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const params = new URLSearchParams();
    [...url.searchParams.entries()]
      .filter(([k]) => !k.toLowerCase().startsWith('utm_') && !TRACKING_PARAMS.has(k.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => params.append(k, v));
    url.search = params.toString();
    url.hash = '';
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function getHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function resolveUrl(base: string, path: string): string {
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}
