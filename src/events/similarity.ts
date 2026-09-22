import { fold } from '@/lib/utils/text';

const STOPWORDS = new Set(
  (
    'a o os as um uma uns umas de do da dos das em no na nos nas por para com sem sobre e ou que se ao aos como mais ' +
    'the an of to in on for and or with by from at is are be as it its this that new says say will has have how why what ' +
    'after into over up out about more than introducing introduces announces announcing launches unveils anuncia lanca apresenta'
  ).split(' '),
);

export function tokenize(title: string): string[] {
  return fold(title)
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Coeficiente de Sørensen–Dice entre dois conjuntos de tokens (0..1). */
export function dice(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
