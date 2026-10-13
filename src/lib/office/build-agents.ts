import type { OfficeAgent } from '@/components/OfficeCanvas';
import type { AgentStatus, PublicStats } from '@/data/portal';
import { timeAgo } from '@/lib/format';
import type { Mood } from './engine';
import { DESK_ORDER } from './layout';

const moodOf = (lastAt: string | null, count: number): Mood => {
  if (!count || !lastAt) return 'sleep';
  return Date.now() - new Date(lastAt).getTime() <= 60 * 60_000 ? 'active' : 'idle';
};

/** Monta a lista de agentes do escritório (3 estações do pipeline + repórteres) a partir dos dados reais do portal. */
export function buildOfficeAgents(statuses: AgentStatus[], stats: PublicStats | null): OfficeAgent[] {
  const recentWrite = statuses.map((s) => s.lastAt).filter((v): v is string => !!v).sort().at(-1) ?? null;
  const collectorActive = !!stats?.last_checked_at && Date.now() - new Date(stats.last_checked_at).getTime() <= 30 * 60_000;
  const editorActive = !!recentWrite && Date.now() - new Date(recentWrite).getTime() <= 60 * 60_000;
  const desk = (id: string) => DESK_ORDER.indexOf(id);

  const stations: OfficeAgent[] = [
    {
      id: 'coletor', name: 'Agente Coletor', beat: 'Varre as fontes atrás de notícias novas', mood: collectorActive ? 'active' : 'idle',
      desk: desk('coletor'), sprite: desk('coletor') % 6, station: true,
      status: stats ? `${stats.raw_24h} itens em 24 h${stats.last_checked_at ? ` · varreu ${timeAgo(stats.last_checked_at)}` : ''}` : 'sem dados',
    },
    {
      id: 'editor', name: 'Agente Editor', beat: 'Agrupa quem fala do mesmo fato num só evento', mood: collectorActive ? 'active' : 'idle',
      desk: desk('editor'), sprite: desk('editor') % 6, station: true, status: stats ? `${stats.events_24h} eventos em 24 h` : 'sem dados',
    },
    {
      id: 'editor-chefe', name: 'Editor-chefe IA', beat: 'Redige, classifica e revisa antes de publicar', mood: editorActive ? 'active' : 'idle',
      desk: desk('editor-chefe'), sprite: desk('editor-chefe') % 6, station: true,
      status: stats ? `${stats.published_24h} matérias em 24 h${recentWrite ? ` · escreveu ${timeAgo(recentWrite)}` : ''}` : 'sem dados',
    },
  ];
  const reporters: OfficeAgent[] = statuses.map((s) => ({
    id: s.agent.id, name: s.agent.name, beat: s.agent.beat, mood: moodOf(s.lastAt, s.count24h),
    desk: desk(s.agent.id), sprite: desk(s.agent.id) % 6,
    status: s.count24h ? `${s.count24h} em 24 h · ${timeAgo(s.lastAt)}` : 'sem matérias em 24 h',
    lastTitle: s.lastTitle, lastSlug: s.lastSlug,
  }));
  return [...stations, ...reporters];
}
