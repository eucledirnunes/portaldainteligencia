import { TILE, type Dir, type Office, type Seat } from './layout';

/**
 * Motor de movimento dos personagens (sem DOM): busca de caminho em grade e a pequena máquina de estados
 * que decide o que cada agente faz conforme o estado real do pipeline:
 *  - active: sentado na mesa, digitando (PC ligado);
 *  - idle:   circula pela redação, às vezes senta no sofá/mesa de reunião para ler, e volta à mesa para ler;
 *  - sleep:  sentado na mesa, cochilando (sem matéria nas últimas 24 h).
 */
export type Mood = 'active' | 'idle' | 'sleep';
export type Pose = 'walk' | 'stand' | 'type' | 'read' | 'nap';

export interface Char {
  id: string;
  sprite: number;
  mood: Mood;
  /** Posição em px (centro do tile). */
  x: number;
  y: number;
  col: number;
  row: number;
  dir: Dir;
  pose: Pose;
  path: { col: number; row: number }[];
  seat: Seat | null;
  homeSeat: Seat;
  /** Tempo restante (s) na ação atual (pausa/sentado). */
  timer: number;
  /** Quantas voltas antes de voltar à mesa. */
  laps: number;
  frameT: number;
}

const WALK_SPEED = 44; // px/s
const WALK_FRAMES = [0, 1, 2, 1];

export function findPath(
  blocked: boolean[][], from: { col: number; row: number }, to: { col: number; row: number },
): { col: number; row: number }[] {
  const rows = blocked.length, cols = blocked[0].length;
  if (from.col === to.col && from.row === to.row) return [];
  const key = (c: number, r: number) => r * cols + c;
  const prev = new Map<number, number>();
  const seen = new Set<number>([key(from.col, from.row)]);
  const queue = [from];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    for (const [dc, dr] of dirs) {
      const c = cur.col + dc, r = cur.row + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
      const k = key(c, r);
      if (seen.has(k)) continue;
      const isTarget = c === to.col && r === to.row;
      if (blocked[r][c] && !isTarget) continue; // o destino pode ser um assento (bloqueado para os demais)
      seen.add(k);
      prev.set(k, key(cur.col, cur.row));
      if (isTarget) {
        const path: { col: number; row: number }[] = [];
        let p: number | undefined = k;
        while (p !== undefined && p !== key(from.col, from.row)) {
          path.push({ col: p % cols, row: Math.floor(p / cols) });
          p = prev.get(p);
        }
        return path.reverse();
      }
      queue.push({ col: c, row: r });
    }
  }
  return [];
}

const centerX = (col: number) => col * TILE + TILE / 2;
const centerY = (row: number) => row * TILE + TILE / 2;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Tiles livres para circular (alcançáveis a partir do corredor superior). */
export function walkableTiles(o: Office): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  const start = { col: 2, row: 2 };
  const reach = new Set<number>();
  const q = [start];
  reach.add(start.row * o.cols + start.col);
  for (let i = 0; i < q.length; i++) {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = q[i].col + dc, r = q[i].row + dr;
      if (c < 0 || r < 0 || c >= o.cols || r >= o.rows || o.blocked[r][c] || reach.has(r * o.cols + c)) continue;
      reach.add(r * o.cols + c);
      q.push({ col: c, row: r });
    }
  }
  for (const k of reach) out.push({ col: k % o.cols, row: Math.floor(k / o.cols) });
  return out;
}

export function createChar(o: Office, id: string, sprite: number, mood: Mood, homeSeat: Seat, free: { col: number; row: number }[]): Char {
  const seated = mood !== 'idle';
  const spot = seated ? { col: homeSeat.col, row: homeSeat.row } : free[Math.floor(Math.random() * free.length)];
  return {
    id, sprite, mood, x: centerX(spot.col), y: centerY(spot.row), col: spot.col, row: spot.row,
    dir: seated ? homeSeat.dir : 'down', pose: seated ? (mood === 'active' ? 'type' : 'nap') : 'stand',
    path: [], seat: seated ? homeSeat : null, homeSeat, timer: rand(0.5, 5), laps: 0, frameT: Math.random() * 3,
  };
}

function goTo(ch: Char, o: Office, col: number, row: number) {
  ch.path = findPath(o.blocked, { col: ch.col, row: ch.row }, { col, row });
  ch.seat = null;
  if (ch.path.length) ch.pose = 'walk';
}

/** Avança a simulação em dt segundos. `occupied` = ids de assentos em uso por outros. */
export function stepChar(ch: Char, dt: number, o: Office, free: { col: number; row: number }[], occupied: Set<string>) {
  ch.frameT += dt;

  // Mudou para 'active'/'sleep' enquanto circulava: volta para a mesa.
  const wantsDesk = ch.mood !== 'idle';
  if (ch.pose === 'walk') {
    const next = ch.path[0];
    if (!next) {
      ch.pose = 'stand';
    } else {
      const tx = centerX(next.col), ty = centerY(next.row);
      const dx = tx - ch.x, dy = ty - ch.y;
      const dist = Math.hypot(dx, dy);
      const step = WALK_SPEED * dt;
      ch.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (dist <= step) {
        ch.x = tx; ch.y = ty; ch.col = next.col; ch.row = next.row;
        ch.path.shift();
      } else {
        ch.x += (dx / dist) * step; ch.y += (dy / dist) * step;
      }
      if (!ch.path.length) {
        // chegou: assentos de mesa/sofá viram pose sentada
        const seat = o.seats.find((s) => s.col === ch.col && s.row === ch.row);
        if (seat && (seat.id === ch.homeSeat.id || (ch.mood === 'idle' && seat.kind === 'lounge'))) {
          ch.seat = seat;
          ch.dir = seat.dir;
          ch.pose = seat.id === ch.homeSeat.id ? (ch.mood === 'active' ? 'type' : ch.mood === 'sleep' ? 'nap' : 'read') : 'read';
          ch.timer = ch.pose === 'read' ? rand(20, 45) : 1e9;
        } else {
          ch.pose = 'stand';
          ch.timer = rand(2, 9);
        }
      }
    }
    if (wantsDesk && ch.path.length && ch.seat === null) {
      const last = ch.path[ch.path.length - 1];
      if (last.col !== ch.homeSeat.col || last.row !== ch.homeSeat.row) goTo(ch, o, ch.homeSeat.col, ch.homeSeat.row);
    }
    return;
  }

  // Parado, sentado ou lendo.
  if (wantsDesk) {
    const atDesk = ch.seat?.id === ch.homeSeat.id;
    if (!atDesk) {
      if (ch.seat) { // levanta do sofá antes de caminhar
        occupied.delete(ch.seat.id);
      }
      goTo(ch, o, ch.homeSeat.col, ch.homeSeat.row);
      return;
    }
    ch.pose = ch.mood === 'active' ? 'type' : 'nap';
    ch.dir = ch.homeSeat.dir;
    return;
  }

  // idle
  if (ch.seat?.id === ch.homeSeat.id && ch.pose !== 'read') ch.pose = 'read';
  ch.timer -= dt;
  if (ch.timer > 0) return;
  if (ch.seat) occupied.delete(ch.seat.id);
  ch.seat = null;

  const r = Math.random();
  if (ch.laps >= 3 && r < 0.6) {
    ch.laps = 0;
    goTo(ch, o, ch.homeSeat.col, ch.homeSeat.row);
    if (!ch.path.length) { ch.pose = 'read'; ch.seat = ch.homeSeat; ch.dir = ch.homeSeat.dir; ch.timer = rand(20, 40); }
    return;
  }
  if (r < 0.3) {
    const spots = o.seats.filter((s) => s.kind === 'lounge' && !occupied.has(s.id));
    const s = spots[Math.floor(Math.random() * spots.length)];
    if (s) {
      occupied.add(s.id);
      goTo(ch, o, s.col, s.row);
      return;
    }
  }
  const t = free[Math.floor(Math.random() * free.length)];
  ch.laps++;
  goTo(ch, o, t.col, t.row);
  if (!ch.path.length) ch.timer = rand(2, 6);
}

/** Frame da folha do personagem (coluna) e linha (direção) para a pose atual. */
export function frameFor(ch: Char): { col: number; row: number; flip: boolean } {
  const row = ch.dir === 'down' ? 0 : ch.dir === 'up' ? 1 : 2;
  const flip = ch.dir === 'left';
  const t = ch.frameT;
  switch (ch.pose) {
    case 'walk': return { col: WALK_FRAMES[Math.floor(t / 0.15) % 4], row, flip };
    case 'type': return { col: 3 + (Math.floor(t / 0.3) % 2), row, flip };
    case 'read': return { col: 5 + (Math.floor(t / 1.2) % 2), row, flip };
    case 'nap': return { col: 5, row, flip };
    default: return { col: 1, row, flip };
  }
}

export const isSitting = (ch: Char) => !!ch.seat && ch.pose !== 'walk';
