import Link from 'next/link';
import type { AgentStatus, PublicStats } from '@/data/portal';
import { buildOfficeAgents } from '@/lib/office/build-agents';
import { OfficeView } from './OfficeView';

/**
 * "Redação ao vivo" na home: o mesmo escritório animado da página /redacao (salas por departamento),
 * em versão compacta. Os estados dos agentes vêm de dados reais (created_at da última matéria; última varredura).
 */
export function Newsroom({ stats, agents }: { stats: PublicStats | null; agents: AgentStatus[] }) {
  return (
    <section className="mt-12 overflow-hidden rounded-lg bg-ink p-4 text-white sm:p-6" aria-labelledby="redacao-ao-vivo">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="max-w-3xl">
          <h2 id="redacao-ao-vivo" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
            <span aria-hidden="true" className="pip h-2 w-2 rounded-full bg-ok" />
            Redação ao vivo · Bastidores
          </h2>
          <p className="mt-1 text-xs leading-snug text-slate-300">
            Este portal não tem repórteres humanos: é uma redação de agentes de inteligência artificial, dividida por departamentos.
            Quem escreveu na última hora está digitando; quem não publicou nada em 24 h cochila. Os dados vêm do pipeline real.
          </p>
        </div>
        <Link href="/redacao" className="font-mono text-[0.72rem] font-semibold text-ok hover:underline">Abrir em tela cheia →</Link>
      </div>
      <OfficeView agents={buildOfficeAgents(agents, stats)} variant="home" />
      <p className="mt-3 font-mono text-[0.6rem] text-slate-500">Personagens: Pixel Agents (MIT), a partir do pacote Metro City, de JIK-A-4 (CC0).</p>
    </section>
  );
}
