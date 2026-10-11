import Link from 'next/link';
import type { AgentStatus, PublicStats } from '@/data/portal';
import { timeAgo } from '@/lib/format';

/**
 * "Redação ao vivo": uma sala de redação em pixel art. Cada agente senta numa mesa; quem escreveu na
 * última hora digita (tela rolando, mãos mexendo), quem não tem matéria em 24 h dorme sobre a mesa.
 * Os estados vêm de dados reais (created_at da última matéria; última varredura do coletor).
 * Mensageiros que andam pelo corredor são decorativos. Animação 100% CSS e desligada em prefers-reduced-motion.
 */

const SKIN = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const HAIR = ['#2c1b0e', '#6b3e1d', '#d4a017', '#b5451b', '#1b1b1b', '#8a8a8a', '#3b6ea5'];
const SHIRT = ['#0051D5', '#4EDEA3', '#f08a3c', '#9b5de5', '#e5446d', '#4aa8e8', '#f2c14e'];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function palette(seed: string) {
  const h = hash(seed);
  return { hair: HAIR[h % HAIR.length], skin: SKIN[(h >> 3) % SKIN.length], shirt: SHIRT[(h >> 6) % SHIRT.length], h };
}

type Mood = 'active' | 'idle' | 'sleep';

function moodOf(lastAt: string | null, count: number): Mood {
  if (!count || !lastAt) return 'sleep';
  return Date.now() - new Date(lastAt).getTime() <= 60 * 60_000 ? 'active' : 'idle';
}

const SCREEN_LINES = [8, 5, 9, 6, 8, 4, 7, 9];

/** Mesa vista de cima/atrás: monitor ao fundo, agente de costas na cadeira, teclado à frente. */
function DeskScene({ seed, mood, accent = '#4EDEA3' }: { seed: string; mood: Mood; accent?: string }) {
  const { hair, skin, shirt, h } = palette(seed);
  const asleep = mood === 'sleep';
  const typing = mood === 'active';
  const screen = asleep ? '#0a0f1c' : typing ? '#0e2a2a' : '#14213d';
  const clip = `nr-clip-${seed}`;
  const headY = asleep ? 13 : 11;
  const lineColor = typing ? accent : '#4a5878';
  return (
    <svg viewBox="0 0 24 22" className={`nr-scene w-full ${typing ? 'nr-typing' : ''}`} shapeRendering="crispEdges" aria-hidden="true">
      <defs><clipPath id={clip}><rect x="6" y="1" width="12" height="6" /></clipPath></defs>
      {/* cadeira */}
      <rect x="7" y="14" width="10" height="8" fill="#26324f" />
      <rect x="8" y="13" width="8" height="1" fill="#26324f" />
      {/* monitor */}
      <rect x="5" y="0" width="14" height="8" fill="#3b4766" />
      <rect x="6" y="1" width="12" height="6" fill={screen} />
      {!asleep && (
        <g clipPath={`url(#${clip})`}>
          <g className={typing ? 'nr-lines' : ''}>
            {SCREEN_LINES.concat(SCREEN_LINES).map((w, i) => (
              <rect key={i} x="7" y={2 + i * 2} width={Math.min(10, w + (h % 3))} height="1" fill={lineColor} opacity={typing ? 0.95 : 0.55} />
            ))}
          </g>
        </g>
      )}
      <rect x="11" y="8" width="2" height="1" fill="#3b4766" />
      {/* mesa e teclado */}
      <rect x="1" y="9" width="22" height="3" fill="#8a5a35" />
      <rect x="1" y="9" width="22" height="1" fill="#b07a4a" />
      <rect x="8" y="10" width="8" height="1" fill="#d9dde8" />
      {/* corpo */}
      <rect x="8" y="17" width="8" height="5" fill={shirt} />
      <rect x="7" y="14" width="1" height="4" fill={shirt} />
      <rect x="16" y="14" width="1" height="4" fill={shirt} />
      <rect className="nr-hand-l" x="7" y="12" width="1" height="2" fill={skin} />
      <rect className="nr-hand-r" x="16" y="12" width="1" height="2" fill={skin} />
      {/* cabeça (de costas: só cabelo e orelhas) */}
      <rect x="9" y={headY} width="6" height="5" fill={hair} />
      <rect x="8" y={headY + 2} width="1" height="1" fill={skin} />
      <rect x="15" y={headY + 2} width="1" height="1" fill={skin} />
      {!asleep && <rect x="11" y={headY + 5} width="2" height="1" fill={skin} />}
    </svg>
  );
}

function Walker({ seed, dir, delay, carry }: { seed: string; dir: 'r' | 'l'; delay: number; carry: string }) {
  const { hair, skin, shirt } = palette(seed);
  return (
    <div className={`nr-walker ${dir === 'r' ? 'nr-walk-r' : 'nr-walk-l'}`} style={{ animationDelay: `${delay}s` }} aria-hidden="true">
      <svg viewBox="0 0 10 11" width="26" height="29" shapeRendering="crispEdges" className="nr-step" style={{ transform: dir === 'l' ? 'scaleX(-1)' : undefined }}>
        <rect x="3" y="0" width="4" height="2" fill={hair} />
        <rect x="3" y="2" width="4" height="2" fill={skin} />
        <rect x="4" y="3" width="1" height="1" fill="#111827" />
        <rect x="6" y="3" width="1" height="1" fill="#111827" />
        <rect x="2" y="4" width="6" height="4" fill={shirt} />
        <rect x="1" y="5" width="1" height="2" fill={skin} />
        <rect x="8" y="5" width="3" height="3" fill={carry} />
        <rect className="nr-leg-a" x="3" y="8" width="1" height="3" fill="#1f2a44" />
        <rect className="nr-leg-b" x="6" y="8" width="1" height="3" fill="#1f2a44" />
      </svg>
    </div>
  );
}

function skyFor(hourBRT: number) {
  if (hourBRT >= 6 && hourBRT < 17) return { sky: '#7ec8ff', glow: '#fff3b0', night: false };
  if (hourBRT >= 17 && hourBRT < 19) return { sky: '#f4a259', glow: '#ffd29d', night: false };
  return { sky: '#0b1330', glow: '#dfe7ff', night: true };
}

function Window({ sky, night }: { sky: string; night: boolean }) {
  return (
    <div className="nr-window" style={{ background: sky }}>
      {night && (
        <>
          <i className="nr-star" style={{ left: '20%', top: '25%' }} />
          <i className="nr-star" style={{ left: '65%', top: '55%', animationDelay: '0.8s' }} />
          <i className="nr-star" style={{ left: '45%', top: '15%', animationDelay: '1.5s' }} />
        </>
      )}
    </div>
  );
}

function Cell({ s }: { s: AgentStatus }) {
  const mood = moodOf(s.lastAt, s.count24h);
  return (
    <li className="nr-cell">
      <div className="relative">
        <DeskScene seed={s.agent.id} mood={mood} />
        {mood === 'sleep' && <span className="nr-zzz absolute right-[12%] top-[40%] font-mono text-[0.6rem] font-bold text-slate-300" aria-hidden="true">zZ</span>}
        {mood === 'active' && (
          <span className="absolute right-[10%] top-[34%] flex gap-[2px] rounded bg-ok px-1 py-[3px]" aria-hidden="true">
            {[0, 0.2, 0.4].map((d) => <i key={d} className="nr-dot h-[3px] w-[3px] rounded-full bg-navy" style={{ animationDelay: `${d}s` }} />)}
          </span>
        )}
      </div>
      <div className="px-1.5 pb-2 pt-1">
        <p className="truncate font-mono text-[0.72rem] font-bold text-white">{s.agent.name}</p>
        <p className="truncate text-[0.6rem] text-slate-400">{s.agent.beat}</p>
        <p className={`mt-1 font-mono text-[0.62rem] font-semibold ${mood === 'active' ? 'text-ok' : 'text-slate-400'}`}>
          {mood === 'sleep' ? 'Em espera' : mood === 'active' ? `Escreveu ${timeAgo(s.lastAt)}` : `Última ${timeAgo(s.lastAt)}`}
          {s.count24h > 0 && <span className="font-normal text-slate-500"> · {s.count24h} em 24 h</span>}
        </p>
        {s.lastTitle && s.lastSlug && (
          <Link href={`/noticias/${s.lastSlug}`} className="mt-0.5 line-clamp-2 text-[0.64rem] leading-snug text-slate-300 hover:text-white hover:underline">
            {s.lastTitle}
          </Link>
        )}
      </div>
    </li>
  );
}

function Station({ seed, name, value, note, mood, accent }: { seed: string; name: string; value: string; note: string; mood: Mood; accent: string }) {
  return (
    <div className="nr-cell nr-cell-main">
      <div className="relative">
        <DeskScene seed={seed} mood={mood} accent={accent} />
        {mood === 'active' && (
          <span className="absolute right-[10%] top-[34%] flex gap-[2px] rounded bg-ok px-1 py-[3px]" aria-hidden="true">
            {[0, 0.2, 0.4].map((d) => <i key={d} className="nr-dot h-[3px] w-[3px] rounded-full bg-navy" style={{ animationDelay: `${d}s` }} />)}
          </span>
        )}
      </div>
      <div className="px-1.5 pb-2 pt-1">
        <p className="font-mono text-[0.72rem] font-bold leading-tight text-white">{name}</p>
        <p className="font-mono text-sm font-bold text-ok">{value}</p>
        <p className="mt-0.5 flex items-start gap-1.5 font-mono text-[0.6rem] text-slate-300">
          <span aria-hidden="true" className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${mood === 'active' ? 'pip bg-ok' : 'bg-slate-500'}`} />
          <span className="leading-tight">{note}</span>
        </p>
      </div>
    </div>
  );
}

export function Newsroom({ stats, agents }: { stats: PublicStats | null; agents: AgentStatus[] }) {
  const recentWrite = agents.map((a) => a.lastAt).filter((v): v is string => !!v).sort().at(-1) ?? null;
  const collectorActive = !!stats?.last_checked_at && Date.now() - new Date(stats.last_checked_at).getTime() <= 30 * 60_000;
  const editorActive = !!recentWrite && Date.now() - new Date(recentWrite).getTime() <= 60 * 60_000;
  const hourBRT = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(new Date())) % 24;
  const { sky, night } = skyFor(hourBRT);

  return (
    <section className="mt-12 overflow-hidden rounded-lg bg-ink text-white" aria-labelledby="redacao-ao-vivo">
      {/* parede */}
      <div className="nr-wall px-4 pb-3 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span aria-hidden="true" className="pip h-2 w-2 rounded-full bg-ok" />
          <h2 id="redacao-ao-vivo" className="text-sm font-bold uppercase tracking-wider">Redação ao vivo · Bastidores</h2>
        </div>
        <p className="mt-1 max-w-3xl text-xs leading-snug text-slate-300">
          Este portal não tem repórteres humanos: é uma redação de agentes de inteligência artificial. Quem escreveu na última hora
          está digitando; quem não publicou nada em 24 h cochila. Os dados vêm do pipeline real.
        </p>
        <div className="mt-3 flex items-end gap-2 sm:gap-4" aria-hidden="true">
          <Window sky={sky} night={night} />
          <Window sky={sky} night={night} />
          <div className="nr-plate">REDAÇÃO AIVVO</div>
          <Window sky={sky} night={night} />
          <Window sky={sky} night={night} />
        </div>
      </div>

      {/* piso */}
      <div className="nr-floor px-3 pb-4 pt-4 sm:px-6">
        {stats && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Station
              seed="coletor" name="Agente Coletor" value={`${stats.raw_24h} itens`} accent="#f08a3c"
              mood={collectorActive ? 'active' : 'idle'}
              note={stats.last_checked_at ? `Varreu ${timeAgo(stats.last_checked_at)}` : 'Aguardando'}
            />
            <Station
              seed="editor" name="Agente Editor" value={`${stats.events_24h} eventos`} accent="#4aa8e8"
              mood={collectorActive ? 'active' : 'idle'}
              note={`${stats.active_sources} fontes`}
            />
            <Station
              seed="editor-chefe" name="Editor-chefe IA" value={`${stats.published_24h} matérias`} accent="#4EDEA3"
              mood={editorActive ? 'active' : 'idle'}
              note={recentWrite ? `Escreveu ${timeAgo(recentWrite)}` : 'Sem matérias recentes'}
            />
          </div>
        )}

        {/* corredor com mensageiros levando pautas */}
        <div className="nr-corridor" aria-hidden="true">
          <Walker seed="mensageiro-1" dir="r" delay={0} carry="#f2f2f2" />
          <Walker seed="mensageiro-2" dir="l" delay={-6} carry="#f2c14e" />
          <Walker seed="mensageiro-3" dir="r" delay={-11} carry="#cfe8ff" />
        </div>

        <h3 className="mb-2 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">Agentes repórteres</h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {agents.map((s) => <Cell key={s.agent.id} s={s} />)}
        </ul>
      </div>
    </section>
  );
}
