'use client';

import { useEffect, useState } from 'react';

const BANNERS = [
  { src: '/banners/vanessa-da-viagem.webp', alt: 'Vanessa da Viagem — agente de viagens' },
  { src: '/banners/casa-pg.webp', alt: 'Casa PG Sinalizações' },
  { src: '/banners/casa-do-guincheiro.webp', alt: 'Casa do Guincheiro' },
  { src: '/banners/nihao.webp', alt: 'Nihao — Missão Empresarial China, outubro de 2027' },
];

const INTERVAL_MS = 4000;

/** Faixa de banners (publicidade) que alterna sozinha a cada 4 s; pausa com o mouse em cima. */
export function BannerCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % BANNERS.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      aria-label="Publicidade" aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className="relative mb-8 aspect-[4/1] w-full overflow-hidden rounded-lg bg-black"
    >
      {BANNERS.map((b, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={b.src} src={b.src} alt={b.alt} aria-hidden={k !== i}
          loading={k === 0 ? 'eager' : 'lazy'} decoding="async"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${k === i ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {BANNERS.map((b, k) => (
          <button
            key={b.src} type="button" aria-label={`Banner ${k + 1}`} onClick={() => setI(k)}
            className={`h-1.5 w-1.5 rounded-full ${k === i ? 'bg-white' : 'bg-white/40'}`}
          />
        ))}
      </div>
    </section>
  );
}
