'use client';

import Link from 'next/link';
import { useState } from 'react';
import { OfficeCanvas, type OfficeAgent } from './OfficeCanvas';

const MOOD_LABEL = { active: 'Escrevendo agora', idle: 'Circulando pela redação', sleep: 'Em espera (cochilando)' } as const;
const MOOD_DOT = { active: 'bg-ok', idle: 'bg-amber-400', sleep: 'bg-slate-500' } as const;

/** Escritório animado + painel do agente selecionado + lista de todos os agentes (acessível por teclado). */
export function OfficeView({ agents, variant = 'page' }: { agents: OfficeAgent[]; variant?: 'page' | 'home' }) {
  const home = variant === 'home';
  const [selected, setSelected] = useState<string | null>(null);
  const sel = agents.find((a) => a.id === selected) ?? null;
  const counts = { active: 0, idle: 0, sleep: 0 };
  for (const a of agents) counts[a.mood]++;

  return (
    <div>
      <div className={`mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[0.72rem] ${home ? 'text-slate-300' : 'text-muted'}`}>
        {(['active', 'idle', 'sleep'] as const).map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${MOOD_DOT[m]}`} />
            <b className={home ? 'text-white' : 'text-ink'}>{counts[m]}</b> {MOOD_LABEL[m].toLowerCase()}
          </span>
        ))}
      </div>

      <OfficeCanvas agents={agents} selected={selected} onSelect={setSelected} />
      <p className={`mt-2 font-mono text-[0.66rem] md:hidden ${home ? 'text-slate-500' : 'text-muted'}`} aria-hidden="true">← arraste para os lados para ver todas as salas →</p>

      <div className={`mt-4 min-h-[5.5rem] rounded-lg p-4 text-white ${home ? 'bg-navy' : 'bg-ink'}`} aria-live="polite">
        {sel ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-mono text-sm font-bold">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${MOOD_DOT[sel.mood]}`} />
                {sel.name}
              </p>
              <p className="text-xs text-slate-400">{sel.beat}</p>
              <p className={`mt-1 font-mono text-xs font-semibold ${sel.mood === 'active' ? 'text-ok' : 'text-slate-300'}`}>
                {MOOD_LABEL[sel.mood]} · {sel.status}
              </p>
            </div>
            {sel.lastTitle && sel.lastSlug && (
              <Link href={`/noticias/${sel.lastSlug}`} className="max-w-md text-sm leading-snug text-slate-200 hover:text-white hover:underline">
                <span className="block font-mono text-[0.62rem] uppercase tracking-wider text-slate-500">Última matéria</span>
                {sel.lastTitle}
              </Link>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Clique no nome de um agente para ver o que ele está fazendo e a última matéria que escreveu.</p>
        )}
      </div>

      {!home && (
        <>
      <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-wider">Todos os agentes</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((a) => (
          <li key={a.id}>
            <button
              type="button" onClick={() => { setSelected(a.id); document.querySelector('[aria-live=polite]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
              className="flex w-full items-center gap-3 rounded bg-low px-3 py-2 text-left hover:bg-container"
            >
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${MOOD_DOT[a.mood]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{a.name}</span>
                <span className="block truncate text-xs text-muted">{a.beat}</span>
              </span>
              <span className="shrink-0 font-mono text-[0.66rem] text-muted">{a.status}</span>
            </button>
          </li>
        ))}
      </ul>
        </>
      )}
    </div>
  );
}
