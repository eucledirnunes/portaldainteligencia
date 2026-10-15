import { NextResponse } from 'next/server';
import { getArticle, getFeed, getPublicStats } from '@/data/portal';
import { DESK_COUNT, DESK_ORDER } from '@/lib/office/layout';

/**
 * Dados reais para a página "Como funciona" (public/como-funciona.html): números do pipeline,
 * uma matéria recém-publicada (texto para a cena do pico) e as manchetes mais recentes. Nada é inventado.
 */
export const dynamic = 'force-dynamic';

/** Primeiros parágrafos do texto, sem links e sem intertítulos, terminando numa frase completa. */
function excerpt(content: string | null, max = 900): string {
  if (!content) return '';
  const paras = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('## ') && !p.startsWith('- '))
    .map((p) => p.replace(/\[([^\]]+)\]\(https?:\/\/[^)]*\)/g, '$1').replace(/\(?https?:\/\/[^\s)]+\)?/g, '').replace(/\s{2,}/g, ' ').trim());
  let out = '';
  for (const p of paras) {
    if (out.length >= max * 0.7) break;
    out += (out ? '\n\n' : '') + p;
  }
  if (out.length > max) {
    const cut = out.slice(0, max);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
    out = end > max * 0.5 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
  }
  return out;
}

const spriteOf = (agentId: string) => Math.max(0, DESK_ORDER.indexOf(agentId)) % 6;

export async function GET() {
  const [stats, feed] = await Promise.all([getPublicStats(), getFeed({ limit: 14 })]);

  let lead: Record<string, unknown> | null = null;
  for (const card of feed.slice(0, 8)) {
    const a = await getArticle(card.slug);
    const text = excerpt(a?.content ?? null);
    if (a && text.length >= 500) {
      lead = {
        title: a.title, subtitle: a.subtitle, category: a.category?.name ?? null, slug: a.slug, publishedAt: a.published_at, text,
        agent: { name: a.agent.name, beat: a.agent.beat, sprite: spriteOf(a.agent.id) },
      };
      break;
    }
  }

  const leadSlug = (lead?.slug as string | undefined) ?? null;
  const others = feed
    .filter((c) => c.slug !== leadSlug)
    .slice(0, 3)
    .map((c) => ({ title: c.title, slug: c.slug, publishedAt: c.published_at, agent: { name: c.agent.name, beat: c.agent.beat } }));

  return NextResponse.json(
    {
      stats: stats
        ? { raw24h: stats.raw_24h, events24h: stats.events_24h, published24h: stats.published_24h, activeSources: stats.active_sources }
        : null,
      agents: DESK_COUNT,
      lead,
      others,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  );
}
