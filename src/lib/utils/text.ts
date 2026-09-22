const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

/** Remove tags HTML, decodifica entidades básicas e colapsa espaços. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?-]+$/, '') + '…';
}

/** minúsculas, sem acentos. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function slugify(s: string, maxLen = 80): string {
  return fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '');
}

// --- Idioma e limpeza editorial -------------------------------------------------------------

const PT_WORDS = new Set(
  ('de a o que e do da em um para com não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito ' +
    'há nos já está também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas esse eles estão você foram essa ' +
    'suas às têm numa pelos elas havia seja qual será este dele sobre segundo empresa novo nova anunciou lançou').split(' '),
);
const EN_WORDS = new Set(
  ('the and of to in is that for with on as are was by from at this it its be has have will an or not but new says said how why what ' +
    'after into over about more than their which also can our your we they their launches announces').split(' '),
);

/** Heurística barata (sem LLM): compara stopwords de português vs inglês. Textos curtos demais retornam true (não bloqueia). */
export function looksPortuguese(text: string): boolean {
  const tokens = text.toLowerCase().match(/[a-zà-ú]+/g) ?? [];
  if (tokens.length < 8) return true;
  let pt = 0;
  let en = 0;
  for (const t of tokens) {
    if (PT_WORDS.has(t)) pt++;
    if (EN_WORDS.has(t)) en++;
  }
  return pt > en && pt / tokens.length >= 0.08;
}

const PROMO = /(promo[cç][õo]es|cupom|cupons|ofertas?\b|whatsapp|telegram|siga[- ]nos|siga o |assine|inscreva|clique aqui|newsletter|canal do |📱|👉|📲|📢)/i;

/** Remove frases promocionais/chamadas para redes sociais que vêm coladas no texto das fontes. */
export function stripPromo(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !PROMO.test(s))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
