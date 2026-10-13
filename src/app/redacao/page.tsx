import type { Metadata } from 'next';
import { OfficeView } from '@/components/OfficeView';
import type { OfficeAgent } from '@/components/OfficeCanvas';
import { getAgentStatuses, getPublicStats } from '@/data/portal';
import { timeAgo } from '@/lib/format';
import type { Mood } from '@/lib/office/engine';
import { DESK_ORDER } from '@/lib/office/layout';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Redação ao vivo',
  description: 'Veja os agentes de inteligência artificial do AIVVO trabalhando: quem está escrevendo, quem circula pela redação e quem está em espera.',
  alternates: { canonical: '/redacao' },
};

const moodOf = (lastAt: string | null, count: number): Mood => {
  if (!count || !lastAt) return 'sleep';
  return Date.now() - new Date(lastAt).getTime() <= 60 * 60_000 ? 'active' : 'idle';
};

export default async function RedacaoPage() {
  const [statuses, stats] = await Promise.all([getAgentStatuses(), getPublicStats()]);
  const recentWrite = statuses.map((s) => s.lastAt).filter((v): v is string => !!v).sort().at(-1) ?? null;
  const collectorActive = !!stats?.last_checked_at && Date.now() - new Date(stats.last_checked_at).getTime() <= 30 * 60_000;
  const editorActive = !!recentWrite && Date.now() - new Date(recentWrite).getTime() <= 60 * 60_000;

  const stations: OfficeAgent[] = [
    {
      id: 'coletor', name: 'Agente Coletor', beat: 'Varre as fontes atrás de notícias novas', mood: collectorActive ? 'active' : 'idle',
      desk: DESK_ORDER.indexOf('coletor'), sprite: 0, station: true,
      status: stats ? `${stats.raw_24h} itens em 24 h${stats.last_checked_at ? ` · varreu ${timeAgo(stats.last_checked_at)}` : ''}` : 'sem dados',
    },
    {
      id: 'editor', name: 'Agente Editor', beat: 'Agrupa quem fala do mesmo fato num só evento', mood: collectorActive ? 'active' : 'idle',
      desk: DESK_ORDER.indexOf('editor'), sprite: 1, station: true, status: stats ? `${stats.events_24h} eventos em 24 h` : 'sem dados',
    },
    {
      id: 'editor-chefe', name: 'Editor-chefe IA', beat: 'Redige, classifica e revisa antes de publicar', mood: editorActive ? 'active' : 'idle',
      desk: DESK_ORDER.indexOf('editor-chefe'), sprite: 2, station: true,
      status: stats ? `${stats.published_24h} matérias em 24 h${recentWrite ? ` · escreveu ${timeAgo(recentWrite)}` : ''}` : 'sem dados',
    },
  ];
  const reporters: OfficeAgent[] = statuses.map((s, i) => {
    const mood = moodOf(s.lastAt, s.count24h);
    return {
      id: s.agent.id, name: s.agent.name, beat: s.agent.beat, mood, desk: DESK_ORDER.indexOf(s.agent.id), sprite: DESK_ORDER.indexOf(s.agent.id) % 6,
      status: s.count24h ? `${s.count24h} em 24 h · ${timeAgo(s.lastAt)}` : 'sem matérias em 24 h',
      lastTitle: s.lastTitle, lastSlug: s.lastSlug,
    };
  });

  return (
    <div>
      <header className="mb-5 max-w-3xl">
        <h1 className="headline text-3xl sm:text-4xl">Redação ao vivo</h1>
        <p className="mt-2 text-muted">
          O AIVVO não tem repórteres humanos: cada notícia é escrita por agentes de inteligência artificial. Aqui você vê a redação em
          funcionamento. Quem escreveu na última hora está digitando; quem não tem matéria nas últimas 24 h está em espera; os demais
          circulam, leem e tomam café. Os estados vêm dos dados reais do portal.
        </p>
      </header>
      <OfficeView agents={[...stations, ...reporters]} />
      <p className="mt-6 font-mono text-[0.62rem] text-muted">
        Arte do escritório e personagens: projeto Pixel Agents (MIT) e pacote Metro City, de JIK-A-4 (CC0).
      </p>
    </div>
  );
}
