'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChar, frameFor, isSitting, stepChar, walkableTiles, type Char, type Mood,
} from '@/lib/office/engine';
import { buildOffice, COLS, ROWS, TILE, WALL_COLOR, type FloorTile } from '@/lib/office/layout';

export interface OfficeAgent {
  id: string;
  name: string;
  /** Linha secundária (cobertura do agente ou nota da estação). */
  beat: string;
  mood: Mood;
  /** Mesa de índice N. */
  desk: number;
  sprite: number;
  /** Estação do pipeline (Coletor/Editor/Editor-chefe): rótulo destacado. */
  station?: boolean;
  status: string;
  lastTitle?: string | null;
  lastSlug?: string | null;
}

const W = COLS * TILE;
const H = ROWS * TILE;
const SITTING_OFFSET = 6;
const PC_FRAMES = ['PC_FRONT_ON_1', 'PC_FRONT_ON_2', 'PC_FRONT_ON_3'];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** "Colorize" estilo Photoshop: cinza -> matiz/saturação fixos (mesma ideia do Pixel Agents). */
function colorize(img: HTMLImageElement, c: Omit<FloorTile, 'img'>): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    if (c.c !== 0) l = 0.5 + (l - 0.5) * ((100 + c.c) / 100);
    if (c.b !== 0) l += c.b / 200;
    l = Math.max(0, Math.min(1, l));
    const [r, g, b] = hslToRgb(c.h, c.s / 100, l);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  return cv;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`falha ao carregar ${src}`));
    im.src = src;
  });
}

export function OfficeCanvas({ agents, selected, onSelect }: { agents: OfficeAgent[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const office = useMemo(() => buildOffice(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState<number>(W);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // Ocupa a largura disponível (até 3x), com pixels nítidos (image-rendering: pixelated).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const avail = el.clientWidth;
      setBoxW(Math.min(avail, W * 3));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let visible = true;
    let cleanup = () => {};

    (async () => {
      try {
        const names = [...new Set(office.items.map((i) => i.img)), ...PC_FRAMES];
        const [furn, chars, wallImg, floorImgs] = await Promise.all([
          Promise.all(names.map((n) => loadImage(`/office/furniture/${n}.png`))),
          Promise.all([0, 1, 2, 3, 4, 5].map((i) => loadImage(`/agents/char_${i}.png`))),
          loadImage('/office/walls/wall_0.png'),
          Promise.all(['floor_0', 'floor_6', 'floor_8'].map((n) => loadImage(`/office/floors/${n}.png`))),
        ]);
        if (cancelled) return;
        const furniture = new Map(names.map((n, i) => [n, furn[i]]));
        const floorTiles = new Map<string, HTMLCanvasElement>();
        for (const f of office.floor.flat()) {
          if (!f) continue;
          const key = `${f.img}|${f.h}|${f.s}|${f.b}|${f.c}`;
          if (!floorTiles.has(key)) floorTiles.set(key, colorize(floorImgs[['floor_0', 'floor_6', 'floor_8'].indexOf(f.img)], f));
        }
        const wallSheet = colorize(wallImg, WALL_COLOR);

        // Camada estática: piso.
        const bg = document.createElement('canvas');
        bg.width = W; bg.height = H;
        const bctx = bg.getContext('2d')!;
        bctx.fillStyle = '#0b1220';
        bctx.fillRect(0, 0, W, H);
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const f = office.floor[r][c];
            if (!f) continue;
            bctx.drawImage(floorTiles.get(`${f.img}|${f.h}|${f.s}|${f.b}|${f.c}`)!, c * TILE, r * TILE);
          }
        }

        // Paredes (auto-tile por vizinhança N=1, E=2, S=4, W=8) entram na ordenação por profundidade.
        const walls: { x: number; y: number; zY: number; sx: number; sy: number }[] = [];
        const isWall = (c: number, r: number) => !!office.wall[r]?.[c];
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!office.wall[r][c]) continue;
            const mask = (isWall(c, r - 1) ? 1 : 0) | (isWall(c + 1, r) ? 2 : 0) | (isWall(c, r + 1) ? 4 : 0) | (isWall(c - 1, r) ? 8 : 0);
            walls.push({ x: c * TILE, y: r * TILE + TILE - 32, zY: (r + 1) * TILE, sx: (mask % 4) * 16, sy: Math.floor(mask / 4) * 32 });
          }
        }

        const free = walkableTiles(office);
        // Quem está "de folga" circula sobretudo pela própria sala (departamento); às vezes vai passear pelo prédio.
        const roomOfSeat = (col: number, row: number) => office.rooms.find((r) => col >= r.ix && col < r.ix + r.w && row >= r.iy && row < r.iy + r.h)?.id;
        const freeByRoom = new Map<string, { col: number; row: number }[]>();
        for (const t of free) {
          const id = roomOfSeat(t.col, t.row);
          if (id) freeByRoom.set(id, [...(freeByRoom.get(id) ?? []), t]);
        }
        const pick = (ch: { homeSeat: { col: number; row: number } }) => {
          const own = freeByRoom.get(roomOfSeat(ch.homeSeat.col, ch.homeSeat.row) ?? '');
          const list = own && Math.random() < 0.75 ? own : free;
          return list[Math.floor(Math.random() * list.length)];
        };
        const occupied = new Set<string>();
        const seatById = new Map(office.seats.map((s) => [s.id, s]));
        const charsById = new Map<string, Char>();
        const deskAgent = new Map<number, OfficeAgent>();
        for (const a of agentsRef.current) {
          const home = office.seats.find((s) => s.desk === a.desk);
          if (!home) continue;
          deskAgent.set(a.desk, a);
          charsById.set(a.id, createChar(office, a.id, a.sprite, a.mood, home, pick));
          occupied.add(home.id);
        }
        void seatById;

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        setReady(true);

        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
        io.observe(canvas);
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let last = performance.now();
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          if (!visible) return;
          if (!reduce) for (const ch of charsById.values()) stepChar(ch, dt, office, pick, occupied);

          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(bg, 0, 0);

          type Draw = { z: number; fn: () => void };
          const list: Draw[] = [];
          for (const w of walls) list.push({ z: w.zY, fn: () => ctx.drawImage(wallSheet, w.sx, w.sy, 16, 32, w.x, w.y, 16, 32) });
          const t = now / 1000;
          for (const it of office.items) {
            let img = it.img;
            if (it.pcOf !== undefined) {
              const a = deskAgent.get(it.pcOf);
              img = a && a.mood === 'active' ? PC_FRAMES[Math.floor(t / 0.4) % 3] : 'PC_FRONT_OFF';
            }
            const im = furniture.get(img)!;
            list.push({
              z: it.zY,
              fn: () => {
                if (it.mirror) {
                  ctx.save();
                  ctx.translate(it.x + it.w, it.y);
                  ctx.scale(-1, 1);
                  ctx.drawImage(im, 0, 0);
                  ctx.restore();
                } else ctx.drawImage(im, it.x, it.y);
              },
            });
          }
          for (const ch of charsById.values()) {
            const f = frameFor(ch);
            const sitting = isSitting(ch);
            const behind = ch.seat?.behind;
            const z = behind ? ch.row * TILE + 8 : ch.y + 8 + 0.5;
            const dim = ch.pose === 'nap';
            list.push({
              z,
              fn: () => {
                const x = Math.round(ch.x - 8);
                const y = Math.round(ch.y + 8 - 32 + (sitting ? SITTING_OFFSET : 0));
                ctx.save();
                if (dim) ctx.globalAlpha = 0.75;
                if (f.flip) {
                  ctx.translate(x + 16, y);
                  ctx.scale(-1, 1);
                  ctx.drawImage(chars[ch.sprite], f.col * 16, f.row * 32, 16, 32, 0, 0, 16, 32);
                } else {
                  ctx.drawImage(chars[ch.sprite], f.col * 16, f.row * 32, 16, 32, x, y, 16, 32);
                }
                ctx.restore();
                if (ch.pose === 'nap') {
                  ctx.fillStyle = '#e2e8f0';
                  ctx.font = 'bold 6px monospace';
                  ctx.fillText(Math.floor(now / 700) % 2 ? 'Z' : 'z', x + 12, y + 2);
                } else if (ch.pose === 'type') {
                  ctx.fillStyle = '#4EDEA3';
                  const n = Math.floor(now / 250) % 3;
                  for (let i = 0; i <= n; i++) ctx.fillRect(x + 12 + i * 2, y + 1, 1, 1);
                }
              },
            });
          }
          list.sort((a, b) => a.z - b.z);
          for (const d of list) d.fn();
        };
        raf = requestAnimationFrame(frame);
        cleanup = () => { io.disconnect(); };
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => { cancelled = true; cancelAnimationFrame(raf); cleanup(); };
  }, [office]);

  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return (
    <div ref={boxRef} className="w-full">
      <div className="relative mx-auto overflow-hidden rounded-lg bg-[#0b1220]" style={{ width: boxW, aspectRatio: `${W} / ${H}` }}>
        <canvas
          ref={canvasRef} width={W} height={H} className="absolute inset-0 h-full w-full"
          style={{ imageRendering: 'pixelated' }} role="img"
          aria-label="Escritório da redação com os agentes de IA trabalhando"
        />
        {!ready && !failed && <p className="absolute inset-0 grid place-items-center font-mono text-xs text-slate-400">Abrindo a redação…</p>}
        {failed && <p className="absolute inset-0 grid place-items-center px-6 text-center text-xs text-slate-300">Não foi possível carregar o escritório. Veja a lista de agentes abaixo.</p>}
        {office.rooms.map((r) => (
          <span
            key={r.id}
            style={{ left: pct((r.ix + r.w / 2) * TILE, W), top: pct(r.wallRow * TILE - 6, H), transform: 'translate(-50%, -50%)', fontSize: `${Math.max(7, boxW / W * 5.5)}px` }}
            className="pointer-events-none absolute whitespace-nowrap rounded-sm bg-ok px-1.5 py-px font-mono font-bold uppercase tracking-wider text-navy"
          >
            {r.name}
          </span>
        ))}
        {ready && agents.map((a) => {
          const d = office.desks[a.desk];
          if (!d) return null;
          const on = selected === a.id;
          return (
            <button
              key={a.id} type="button" onClick={() => onSelect(on ? null : a.id)}
              style={{ left: pct(d.col * TILE + 24, W), top: pct(d.row * TILE - 1, H), transform: 'translate(-50%, -100%)', fontSize: `${Math.max(7, boxW / W * 5)}px` }}
              className={`absolute max-w-[10ch] truncate rounded px-1 py-px font-mono font-bold leading-tight ${on ? 'bg-ok text-navy' : a.station ? 'bg-accent text-white' : 'bg-navy/80 text-white hover:bg-navy'}`}
              aria-pressed={on} title={`${a.name} — ${a.beat}`}
            >
              {a.name.replace(/^Agente /, '')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
