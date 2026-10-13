/**
 * Mapa do escritório da tela /redacao (peças do projeto Pixel Agents, MIT; ver public/office/CREDITS.txt).
 * Dados puros (sem DOM) para poder testar a conectividade do mapa. Unidade: tiles de 16 px.
 *
 * Convenção (a mesma do Pixel Agents): a mesa fica ao norte, o PC tem a tela virada para a câmera e o agente
 * senta no banco ao sul da mesa, de costas, olhando para cima.
 */
export const TILE = 16;
export const COLS = 31;
export const ROWS = 26;
export const DESK_COLS = 7;
export const DESK_ROWS = 4;
export const DESK_COUNT = DESK_COLS * DESK_ROWS;

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Item {
  key: string;
  img: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ordenação de profundidade (y da base). */
  zY: number;
  mirror?: boolean;
  /** PC da mesa de índice N: troca o sprite conforme o estado do agente. */
  pcOf?: number;
}

export interface Seat {
  id: string;
  col: number;
  row: number;
  dir: Dir;
  kind: 'desk' | 'lounge';
  /** Mesa de índice N (só kind 'desk'). */
  desk?: number;
  /** Sofá de encosto: o sofá é desenhado depois do personagem (ele aparece "dentro" do sofá). */
  behind?: boolean;
}

export interface FloorTile {
  img: string;
  h: number;
  s: number;
  b: number;
  c: number;
}

export interface Office {
  cols: number;
  rows: number;
  floor: (FloorTile | null)[][];
  wall: boolean[][];
  items: Item[];
  seats: Seat[];
  /** Tiles intransitáveis (móveis, bancos, paredes). */
  blocked: boolean[][];
  /** Posição de cada mesa (índice = vaga de agente). */
  desks: { col: number; row: number; seatId: string }[];
}

const WORK_FLOOR: FloorTile = { img: 'floor_6', h: 25, s: 48, b: -43, c: -88 };
const LOUNGE_FLOOR: FloorTile = { img: 'floor_0', h: 209, s: 39, b: -25, c: -80 };
export const WALL_COLOR = { h: 214, s: 30, b: -100, c: -55 };

/** Tamanho dos sprites usados: [largura, altura] em px. */
export const SPRITE_SIZE: Record<string, [number, number]> = {
  BIN: [16, 16], BOOKSHELF: [32, 16], CACTUS: [16, 32], CLOCK: [16, 32], COFFEE: [16, 16], COFFEE_TABLE: [32, 32],
  CUSHIONED_BENCH: [16, 16], DESK_FRONT: [48, 32], DOUBLE_BOOKSHELF: [32, 32], HANGING_PLANT: [16, 32],
  LARGE_PAINTING: [32, 32], LARGE_PLANT: [32, 48], PC_FRONT_OFF: [16, 32], PC_FRONT_ON_1: [16, 32],
  PC_FRONT_ON_2: [16, 32], PC_FRONT_ON_3: [16, 32], PLANT: [16, 32], PLANT_2: [16, 32], SMALL_PAINTING: [16, 32],
  SMALL_PAINTING_2: [16, 32], SMALL_TABLE_FRONT: [32, 32], SOFA_BACK: [32, 16], SOFA_FRONT: [32, 16],
  SOFA_SIDE: [16, 32], TABLE_FRONT: [48, 64], WHITEBOARD: [32, 32], WOODEN_CHAIR_SIDE: [16, 32],
};

export function buildOffice(): Office {
  const floor: (FloorTile | null)[][] = Array.from({ length: ROWS }, () => Array<FloorTile | null>(COLS).fill(null));
  const wall: boolean[][] = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  const blocked: boolean[][] = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  const items: Item[] = [];
  const seats: Seat[] = [];
  const desks: Office['desks'] = [];

  // Paredes: faixa de cima, laterais e fundo. Piso: trabalho (cima) e sala de estar (baixo).
  for (let c = 0; c < COLS; c++) { wall[1][c] = true; wall[ROWS - 1][c] = true; }
  for (let r = 1; r < ROWS; r++) { wall[r][0] = true; wall[r][COLS - 1] = true; }
  for (let r = 2; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) floor[r][c] = r >= 19 ? LOUNGE_FLOOR : WORK_FLOOR;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (wall[r][c] || !floor[r][c]) blocked[r][c] = true;

  const block = (col: number, row: number, w = 1, h = 1) => {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if (blocked[r]?.[c] !== undefined) blocked[r][c] = true;
  };
  /** Coloca um sprite com o canto superior esquerdo no tile (col,row); a base define a profundidade. */
  const put = (key: string, img: string, col: number, row: number, extra: Partial<Item> = {}) => {
    const [w, h] = SPRITE_SIZE[img];
    items.push({ key, img, x: col * TILE, y: row * TILE, w, h, zY: row * TILE + h, ...extra });
  };

  // Mesas de trabalho: 7 x 4. Mesa 3x2, PC em cima, banco ao sul.
  for (let i = 0; i < DESK_COUNT; i++) {
    const c = 2 + 4 * (i % DESK_COLS);
    const r = 3 + 4 * Math.floor(i / DESK_COLS);
    put(`desk-${i}`, 'DESK_FRONT', c, r);
    put(`pc-${i}`, 'PC_FRONT_OFF', c + 1, r, { pcOf: i, zY: (r + 2) * TILE + 1 });
    put(`bench-${i}`, 'CUSHIONED_BENCH', c + 1, r + 2);
    block(c, r, 3, 2);
    block(c + 1, r + 2); // banco = assento (só o dono entra)
    const seatId = `desk-${i}`;
    seats.push({ id: seatId, col: c + 1, row: r + 2, dir: 'up', kind: 'desk', desk: i });
    desks.push({ col: c, row: r, seatId });
  }

  // Decoração da parede de cima (sobre a faixa de parede da linha 1).
  const wallZ = 2 * TILE + 0.1;
  const deco: [string, number][] = [
    ['DOUBLE_BOOKSHELF', 2], ['CLOCK', 6], ['SMALL_PAINTING', 8], ['LARGE_PAINTING', 10], ['HANGING_PLANT', 13],
    ['WHITEBOARD', 15], ['SMALL_PAINTING_2', 18], ['DOUBLE_BOOKSHELF', 20], ['LARGE_PAINTING', 23], ['HANGING_PLANT', 26],
  ];
  deco.forEach(([img, col], i) => put(`deco-${i}`, img, col, 0, { zY: wallZ }));

  // Sala de estar: dois conjuntos de sofá + mesa de centro.
  const lounge = (col: number, row: number, tag: string) => {
    put(`${tag}-table`, 'COFFEE_TABLE', col, row);
    put(`${tag}-sofa-n`, 'SOFA_FRONT', col, row - 1);
    put(`${tag}-sofa-s`, 'SOFA_BACK', col, row + 2);
    put(`${tag}-sofa-w`, 'SOFA_SIDE', col - 1, row);
    put(`${tag}-sofa-e`, 'SOFA_SIDE', col + 2, row, { mirror: true });
    block(col, row, 2, 2);
    block(col, row - 1, 2, 1);
    block(col, row + 2, 2, 1);
    block(col - 1, row, 1, 2);
    block(col + 2, row, 1, 2);
    seats.push(
      { id: `${tag}-n0`, col, row: row - 1, dir: 'down', kind: 'lounge' },
      { id: `${tag}-n1`, col: col + 1, row: row - 1, dir: 'down', kind: 'lounge' },
      { id: `${tag}-w0`, col: col - 1, row, dir: 'right', kind: 'lounge' },
      { id: `${tag}-w1`, col: col - 1, row: row + 1, dir: 'right', kind: 'lounge' },
      { id: `${tag}-e0`, col: col + 2, row, dir: 'left', kind: 'lounge' },
      { id: `${tag}-e1`, col: col + 2, row: row + 1, dir: 'left', kind: 'lounge' },
      { id: `${tag}-s0`, col, row: row + 2, dir: 'up', kind: 'lounge', behind: true },
      { id: `${tag}-s1`, col: col + 1, row: row + 2, dir: 'up', kind: 'lounge', behind: true },
    );
  };
  lounge(6, 21, 'loungeA');
  lounge(21, 21, 'loungeB');

  // Mesa de reunião com cadeiras laterais.
  put('meeting', 'TABLE_FRONT', 13, 20);
  block(13, 20, 3, 4);
  [[12, 20], [12, 22]].forEach(([c, r], i) => {
    put(`chair-l${i}`, 'WOODEN_CHAIR_SIDE', c, r);
    block(c, r + 1);
    seats.push({ id: `meet-l${i}`, col: c, row: r + 1, dir: 'right', kind: 'lounge' });
  });
  [[16, 20], [16, 22]].forEach(([c, r], i) => {
    put(`chair-r${i}`, 'WOODEN_CHAIR_SIDE', c, r, { mirror: true });
    block(c, r + 1);
    seats.push({ id: `meet-r${i}`, col: c, row: r + 1, dir: 'left', kind: 'lounge' });
  });

  // Cantinho do café e plantas.
  put('coffee-table', 'SMALL_TABLE_FRONT', 26, 21);
  put('coffee', 'COFFEE', 26, 21, { x: 26 * TILE + 8, y: 21 * TILE - 2, zY: 23 * TILE + 1 });
  block(26, 21, 2, 2);
  put('bin', 'BIN', 28, 23);
  block(28, 23);
  put('plant-a', 'LARGE_PLANT', 1, 21);
  block(1, 23, 2, 1);
  put('plant-b', 'PLANT_2', 28, 20);
  block(28, 21);
  put('plant-c', 'PLANT', 4, 19);
  block(4, 20);
  put('cactus', 'CACTUS', 18, 19);
  block(18, 20);

  return { cols: COLS, rows: ROWS, floor, wall, items, seats, blocked, desks };
}
