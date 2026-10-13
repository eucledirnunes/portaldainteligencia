import { describe, expect, it } from 'vitest';
import { findPath, walkableTiles } from '@/lib/office/engine';
import { buildOffice, DESK_COUNT } from '@/lib/office/layout';

describe('escritório (/redacao)', () => {
  const o = buildOffice();
  const free = walkableTiles(o);

  it('tem uma mesa e um assento por vaga de agente', () => {
    expect(o.desks).toHaveLength(DESK_COUNT);
    expect(o.seats.filter((s) => s.kind === 'desk')).toHaveLength(DESK_COUNT);
  });

  it('todo assento é alcançável a partir do corredor', () => {
    for (const s of o.seats) {
      const path = findPath(o.blocked, { col: 2, row: 2 }, { col: s.col, row: s.row });
      expect(path.length, `assento ${s.id}`).toBeGreaterThan(0);
    }
  });

  it('há bastante espaço para circular e nada nasce dentro de móvel', () => {
    expect(free.length).toBeGreaterThan(150);
    for (const t of free) expect(o.blocked[t.row][t.col]).toBe(false);
  });

  it('busca de caminho respeita bloqueios', () => {
    const p = findPath(o.blocked, { col: 2, row: 2 }, { col: 29, row: 18 });
    expect(p.length).toBeGreaterThan(0);
    for (const t of p.slice(0, -1)) expect(o.blocked[t.row][t.col]).toBe(false);
  });
});
