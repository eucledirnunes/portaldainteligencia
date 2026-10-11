import Link from 'next/link';
import type { AgentStatus, PublicStats } from '@/data/portal';
import { timeAgo } from '@/lib/format';

/**
 * "Redação ao vivo": cada agente é um personagem em pixel art numa mesa. Os estados vêm de dados reais
 * (quando o agente escreveu a última matéria; quando o coletor varreu as fontes) — nada é simulado.
 * Animação 100% CSS (sem JS no cliente) e desligada em prefers-reduced-motion.
 */

const SKIN = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR = ['#2c1b0e', '#6b3e1d', '#d4a017', '#b5451b', '#1b1b1b', '#8a8a8a', '#3b6ea5'];
const SHIRT = ['#0051D5', '#4EDEA3', '#f08a3c', '#9b5de5', '#e5446d', '#4aa8e8', '#f2c14e'];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// 8x10: H cabelo, S pele, E olho, T camisa, P calça.
const SPRITE = [
  '..HHHH..',
  '.HHHHHH.',
  '.HSSSSH.',
  '.SSESES.',
  '..SSSS..',
  '.TTTTTT.',
  'STTTTTTS',
  'STTTTTTS',
  '.TTTTTT.',
  '.PP..PP.',
];

function Sprite({ seed, size = 40 }: { seed: string; size?: number }) {
  const h = hash(seed);
  const color: Record<string, string> = {
    H: HAIR[h % HAIR.length],
    S: SKIN[(h >> 3) % SKIN.length],
    E: '#111827',
    T: SHIRT[(h >> 6) % SHIRT.length],
    P: '#1f2a44',
  };
  return (
    <svg className="nr-sprite" width={size} height={(size * 10) / 8} viewBox="0 0 8 10" shapeRendering="crispEdges" aria-hidden="true">
      {SPRITE.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color[ch]} />)),
      )}
    </svg>
  );
}

type Mood = 'active' | 'idle' | 'sleep';

function moodOf(lastAt: string | null, count: number): Mood {
  if (!count || !lastAt) return 'sleep';
  return Date.now() - new Date(lastAt).getTime() <= 60 * 60_000 ? 'active' : 'idle';
}

function Station({ seed, name, role, value, note, active }: { seed: string; name: string; role: string; value: string; note: string; active: boolean }) {
  return (
    <div className={`nr-desk rounded-lg bg-navy p-3 ${active ? 'nr-active' : ''}`}>
      <div className="flex items-center gap-3">
        <Sprite seed={seed} size={36} />
        <div className="min-w-0">
          <p className="font-mono text-[0.75rem] font-bold text-white">{name}</p>
          <p className="text-[0.65rem] leading-tight text-slate-400">{role}</p>
        </div>
        <p className="ml-auto shrink-0 font-mono text-sm font-bold text-ok">{value}</p>
      </div>
      <p className="mt-2 flex items-center gap-1.5 font-mono text-[0.65rem] text-slate-300">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? 'pip bg-ok' : 'bg-slate-500'}`} />
        {note}
      </p>
    </div>
  );
}

function Flow() {
  return (
    <div className="nr-flow relative hidden h-px flex-1 self-center bg-slate-600 md:block" aria-hidden="true">
      {[0, 0.8, 1.6].map((d) => (
        <span key={d} className="nr-packet absolute -top-[3px] h-[7px] w-[7px] rounded-[1px] bg-ok" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

function Reporter({ s }: { s: AgentStatus }) {
  const mood = moodOf(s.lastAt, s.count24h);
  return (
    <li className={`nr-desk flex flex-col rounded-lg bg-navy p-3 ${mood === 'active' ? 'nr-active' : ''} ${mood === 'sleep' ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Sprite seed={s.agent.id} size={32} />
          {mood === 'sleep' && <span className="nr-zzz absolute -right-3 -top-2 font-mono text-[0.6rem] font-bold text-slate-400" aria-hidden="true">zZ</span>}
          {mood === 'active' && (
            <span className="absolute -right-4 -top-2 flex gap-[2px] rounded bg-ok px-1 py-[3px]" aria-hidden="true">
              {[0, 0.2, 0.4].map((d) => <i key={d} className="nr-dot h-[3px] w-[3px] rounded-full bg-navy" style={{ animationDelay: `${d}s` }} />)}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-[0.75rem] font-bold text-white">{s.agent.name}</p>
          <p className="truncate text-[0.62rem] text-slate-400">{s.agent.beat}</p>
        </div>
      </div>
      <div className="mt-2 h-[3px] rounded-full bg-slate-700" aria-hidden="true" />
      <p className={`mt-2 font-mono text-[0.65rem] font-semibold ${mood === 'active' ? 'text-ok' : 'text-slate-400'}`}>
        {mood === 'sleep' ? 'Em espera' : mood === 'active' ? `Escreveu ${timeAgo(s.lastAt)}` : `Última matéria ${timeAgo(s.lastAt)}`}
        {s.count24h > 0 && <span className="font-normal text-slate-500"> · {s.count24h} em 24 h</span>}
      </p>
      {s.lastTitle && s.lastSlug && (
        <Link href={`/noticias/${s.lastSlug}`} className="mt-1 line-clamp-2 text-[0.68rem] leading-snug text-slate-300 hover:text-white hover:underline">
          {s.lastTitle}
        </Link>
      )}
    </li>
  );
}

export function Newsroom({ stats, agents }: { stats: PublicStats | null; agents: AgentStatus[] }) {
  const recentWrite = agents.map((a) => a.lastAt).filter((v): v is string => !!v).sort().at(-1) ?? null;
  const collectorActive = !!stats?.last_checked_at && Date.now() - new Date(stats.last_checked_at).getTime() <= 30 * 60_000;
  const editorActive = !!recentWrite && Date.now() - new Date(recentWrite).getTime() <= 60 * 60_000;

  return (
    <section className="mt-12 rounded-lg bg-ink p-4 text-white sm:p-6" aria-labelledby="redacao-ao-vivo">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className="pip h-2 w-2 rounded-full bg-ok" />
        <h2 id="redacao-ao-vivo" className="text-sm font-bold uppercase tracking-wider">Redação ao vivo · Bastidores</h2>
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-snug text-slate-300">
        Este portal não tem repórteres humanos: é uma redação de agentes de inteligência artificial. Cada agente cobre uma empresa ou editoria,
        e o que aparece aqui vem do pipeline real, atualizado a cada poucos minutos.
      </p>

      {stats && (
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-stretch md:gap-3">
          <div className="md:flex-1">
            <Station
              seed="coletor" name="Agente Coletor" role="Varre as fontes atrás de notícias novas"
              value={`${stats.raw_24h} itens`} active={collectorActive}
              note={stats.last_checked_at ? `Última varredura ${timeAgo(stats.last_checked_at)}` : 'Aguardando varredura'}
            />
          </div>
          <Flow />
          <div className="md:flex-1">
            <Station
              seed="editor" name="Agente Editor" role="Agrupa quem fala do mesmo fato num só evento"
              value={`${stats.events_24h} eventos`} active={collectorActive}
              note={`${stats.active_sources} fontes monitoradas`}
            />
          </div>
          <Flow />
          <div className="md:flex-1">
            <Station
              seed="editor-chefe" name="Editor-chefe IA" role="Redige, classifica e revisa antes de publicar"
              value={`${stats.published_24h} matérias`} active={editorActive}
              note={recentWrite ? `Última matéria ${timeAgo(recentWrite)}` : 'Sem matérias recentes'}
            />
          </div>
        </div>
      )}

      <h3 className="mt-6 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">Agentes repórteres</h3>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {agents.map((s) => <Reporter key={s.agent.id} s={s} />)}
      </ul>
    </section>
  );
}
