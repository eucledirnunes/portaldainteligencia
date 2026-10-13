/**
 * Mapa do escritório da tela /redacao (peças do projeto Pixel Agents, MIT; ver public/office/CREDITS.txt).
 * Dados puros (sem DOM) para poder testar a conectividade do mapa. Unidade: tiles de 16 px.
 *
 * O prédio tem salas por departamento, ligadas por portas. Convenção de cada mesa (a mesma do Pixel Agents):
 * mesa ao norte, PC com a tela virada para a câmera, agente sentado no banco ao sul, de costas.
 * As paredes têm 2 tiles de altura visual (o sprite avança um tile para cima), por isso a linha acima de
 * cada parede horizontal é "cobertura" (vazia) e a decoração fica nessa faixa.
 */
export const TILE = 16;
export const COLS = 43;
export const ROWS = 27;

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

export interface Room {
  id: string;
  name: string;
  /** Canto superior esquerdo do interior e tamanho (tiles). */
  ix: number;
  iy: number;
  w: number;
  h: number;
  /** Linha da parede de cima (onde fica a placa da sala). */
  wallRow: number;
  /** Agentes (ids) por mesa, em ordem. */
  agents: string[];
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
  /** Posição de cada mesa (índice = posição em DESK_ORDER). */
  desks: { col: number; row: number; seatId: string; room: string }[];
  rooms: Room[];
}

const f = (img: string, h: number, s: number, b: number, c: number): FloorTile => ({ img, h, s, b, c });
const WOOD = f('floor_6', 25, 48, -43, -88);
const WOOD_TEAL = f('floor_6', 170, 35, -45, -70);
const WOOD_TAN = f('floor_6', 35, 30, -30, -70);
const BLUE = f('floor_0', 209, 39, -25, -80);
const GREEN = f('floor_0', 160, 30, -40, -70);
const PURPLE = f('floor_0', 280, 30, -35, -75);
const CHECKER = f('floor_8', 209, 0, -16, -8);
export const WALL_COLOR = { h: 214, s: 30, b: -100, c: -55 };

/** Salas (departamentos). Cada sala tem interior de 13 colunas: 3 mesas por fileira, 4 colunas por mesa + corredor. */
const ROOM_DEFS: (Omit<Room, 'w' | 'h'> & { rows: number; floor: FloorTile })[] = [
  { id: 'labs', name: 'Laboratórios de IA', ix: 1, iy: 2, rows: 2, wallRow: 1, floor: WOOD, agents: ['openai', 'anthropic', 'google', 'deepseek', 'xai', 'mistral'] },
  { id: 'infra', name: 'Big Techs e Infraestrutura', ix: 15, iy: 2, rows: 2, wallRow: 1, floor: WOOD_TEAL, agents: ['meta', 'microsoft', 'nvidia', 'amazon'] },
  { id: 'tech', name: 'Tecnologia e Pesquisa', ix: 29, iy: 2, rows: 2, wallRow: 1, floor: BLUE, agents: ['c-modelos', 'c-open-source', 'c-agentes', 'c-pesquisa', 'c-robotica', 'c-ferramentas'] },
  { id: 'market', name: 'Mercado e Políticas', ix: 1, iy: 13, rows: 2, wallRow: 12, floor: WOOD_TAN, agents: ['c-negocios', 'c-startups', 'c-investimentos', 'c-legislacao', 'c-ia-no-brasil', 'geral'] },
  { id: 'ops', name: 'Central de Operações', ix: 15, iy: 13, rows: 1, wallRow: 12, floor: GREEN, agents: ['coletor', 'editor', 'editor-chefe'] },
  { id: 'studio', name: 'Estúdio Criativo', ix: 15, iy: 20, rows: 1, wallRow: 19, floor: PURPLE, agents: ['c-imagem', 'c-video', 'c-audio'] },
];

/** Ids dos agentes na ordem das mesas (índice = mesa). */
export const DESK_ORDER: string[] = ROOM_DEFS.flatMap((r) => r.agents);
export const DESK_COUNT = DESK_ORDER.length;

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
  const items: Item[] = [];
  const seats: Seat[] = [];
  const desks: Office['desks'] = [];
  const rooms: Room[] = [];

  // Paredes: contorno, divisórias verticais (x=14, 28) e horizontais (linhas 12 e, só no meio, 19).
  const hWall = (r: number, c0: number, c1: number) => { for (let c = c0; c <= c1; c++) wall[r][c] = true; };
  hWall(1, 0, COLS - 1); hWall(12, 0, COLS - 1); hWall(ROWS - 1, 0, COLS - 1); hWall(19, 14, 28);
  for (const x of [0, 14, 28, COLS - 1]) for (let r = 1; r < ROWS; r++) wall[r][x] = true;

  // Pisos por sala (sobrepõem o interior).
  const fill = (c0: number, r0: number, c1: number, r1: number, tile: FloorTile) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) floor[r][c] = tile;
  };
  for (const d of ROOM_DEFS) {
    const w = 13, h = 4 * d.rows + 1;
    fill(d.ix, d.iy, d.ix + w - 1, d.iy + h - 1, d.floor);
    rooms.push({ id: d.id, name: d.name, ix: d.ix, iy: d.iy, w, h, wallRow: d.wallRow, agents: d.agents });
  }
  rooms.push({ id: 'lounge', name: 'Sala de Estar e Reunião', ix: 29, iy: 13, w: 13, h: 12, wallRow: 12, agents: [] });
  fill(1, 22, 13, 24, WOOD_TAN); // sobra da sala "Mercado" (copa)
  fill(29, 13, 41, 24, BLUE); // sala de estar
  fill(30, 19, 36, 24, CHECKER); // piso xadrez da área de reunião

  // Portas: abrem a parede (e o piso na faixa de cobertura) para os corredores.
  const doorV = (x: number, rows: number[], left: FloorTile, right: FloorTile) => {
    for (const r of rows) { wall[r][x] = false; floor[r][x] = left; floor[r][x - 1] ??= left; floor[r][x + 1] ??= right; }
  };
  doorV(14, [6, 10], WOOD, WOOD_TEAL);
  doorV(28, [6, 10], WOOD_TEAL, BLUE);
  doorV(14, [17, 24], WOOD_TAN, GREEN);
  doorV(28, [17, 24], GREEN, BLUE);
  const doorH = (cols: number[], wallRow: number, tile: FloorTile) => {
    for (const c of cols) { wall[wallRow][c] = false; floor[wallRow][c] = tile; floor[wallRow - 1][c] = tile; }
  };
  doorH([5, 9], 12, WOOD); doorH([19, 23], 12, WOOD_TEAL); doorH([33, 37], 12, BLUE);
  doorH([19, 23], 19, GREEN);
  // Portas de baixo de cada sala precisam de piso na cobertura (linha acima da parede) para o fluxo contínuo.
  for (const c of [5, 9]) floor[11][c] = WOOD;
  for (const c of [19, 23]) floor[11][c] = WOOD_TEAL;
  for (const c of [33, 37]) floor[11][c] = BLUE;
  for (const c of [19, 23]) floor[18][c] = GREEN;

  const blocked: boolean[][] = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => wall[r][c] || !floor[r][c]));
  const block = (col: number, row: number, w = 1, h = 1) => {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) if (blocked[r]?.[c] !== undefined) blocked[r][c] = true;
  };
  /** Coloca um sprite com o canto superior esquerdo no tile (col,row); a base define a profundidade. */
  const put = (key: string, img: string, col: number, row: number, extra: Partial<Item> = {}) => {
    const [w, h] = SPRITE_SIZE[img];
    items.push({ key, img, x: col * TILE, y: row * TILE, w, h, zY: row * TILE + h, ...extra });
  };

  // Mesas e decoração de cada sala.
  let deskIndex = 0;
  for (const d of ROOM_DEFS) {
    const slots = 3 * d.rows;
    for (let s = 0; s < slots; s++) {
      const c = d.ix + 1 + 4 * (s % 3);
      const r = d.iy + 1 + 4 * Math.floor(s / 3);
      if (s < d.agents.length) {
        const i = deskIndex++;
        put(`desk-${i}`, 'DESK_FRONT', c, r);
        put(`pc-${i}`, 'PC_FRONT_OFF', c + 1, r, { pcOf: i, zY: (r + 2) * TILE + 1 });
        put(`bench-${i}`, 'CUSHIONED_BENCH', c + 1, r + 2);
        block(c, r, 3, 2);
        block(c + 1, r + 2);
        const seatId = `desk-${i}`;
        seats.push({ id: seatId, col: c + 1, row: r + 2, dir: 'up', kind: 'desk', desk: i });
        desks.push({ col: c, row: r, seatId, room: d.id });
      } else {
        // vaga sem agente: cantinho com plantas
        put(`empty-plant-${s}`, 'LARGE_PLANT', c, r);
        block(c, r + 2, 2, 1);
        put(`empty-bin-${s}`, 'BIN', c + 2, r + 1);
        block(c + 2, r + 1);
      }
    }
    // Decoração da parede de cima da sala (na faixa de cobertura, acima da parede).
    const dr = d.wallRow - 1;
    const wallZ = (d.wallRow + 1) * TILE + 0.1;
    put(`${d.id}-shelf`, 'DOUBLE_BOOKSHELF', d.ix + 1, dr, { zY: wallZ });
    put(`${d.id}-clock`, 'CLOCK', d.ix + 6, dr, { zY: wallZ });
    put(`${d.id}-art`, 'LARGE_PAINTING', d.ix + 10, dr, { zY: wallZ });
  }

  // Sala de estar (col. 3, parte de baixo): sofás + mesa de centro, mesa de reunião, café.
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
  lounge(34, 16, 'lounge');

  put('meeting', 'TABLE_FRONT', 32, 20);
  block(32, 20, 3, 4);
  [[31, 20], [31, 22]].forEach(([c, r], i) => {
    put(`chair-l${i}`, 'WOODEN_CHAIR_SIDE', c, r);
    block(c, r + 1);
    seats.push({ id: `meet-l${i}`, col: c, row: r + 1, dir: 'right', kind: 'lounge' });
  });
  [[35, 20], [35, 22]].forEach(([c, r], i) => {
    put(`chair-r${i}`, 'WOODEN_CHAIR_SIDE', c, r, { mirror: true });
    block(c, r + 1);
    seats.push({ id: `meet-r${i}`, col: c, row: r + 1, dir: 'left', kind: 'lounge' });
  });

  put('coffee-table', 'SMALL_TABLE_FRONT', 39, 14);
  put('coffee', 'COFFEE', 39, 14, { x: 39 * TILE + 8, y: 14 * TILE - 2, zY: 16 * TILE + 1 });
  block(39, 14, 2, 2);
  put('bin', 'BIN', 41, 17);
  block(41, 17);
  put('plant-lounge-a', 'LARGE_PLANT', 40, 22);
  block(40, 24, 2, 1);
  put('plant-lounge-b', 'PLANT_2', 30, 14);
  block(30, 15);
  put('cactus', 'CACTUS', 38, 19);
  block(38, 20);

  // Copa do "Mercado" (linhas extras da sala de baixo à esquerda).
  put('copa-table', 'SMALL_TABLE_FRONT', 2, 22);
  put('copa-coffee', 'COFFEE', 2, 22, { x: 2 * TILE + 8, y: 22 * TILE - 2, zY: 24 * TILE + 1 });
  block(2, 22, 2, 2);
  put('copa-bin', 'BIN', 12, 23);
  block(12, 23);
  put('copa-plant', 'PLANT_2', 10, 22);
  block(10, 23);

  return { cols: COLS, rows: ROWS, floor, wall, items, seats, blocked, desks, rooms };
}
