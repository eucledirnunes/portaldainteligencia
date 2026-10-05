import { fold } from '@/lib/utils/text';

/**
 * Política de crédito: o portal não cita nem linka veículos de imprensa; o texto atribui as
 * declarações a quem as fez ("segundo a OpenAI"). Aqui ficam os helpers que detectam menções.
 */

/** "The Verge AI" -> "The Verge"; "MIT News: Inteligência Artificial" -> "MIT News". */
export function cleanOutletName(name: string): string {
  return name.split(':')[0].replace(/\s+(AI|IA)$/i, '').trim();
}

const AMBIGUOUS = new Set(['transformer', 'wired', 'guardian', 'conversation', 'spectrum', 'inovacao tecnologica', 'ai business']);

/**
 * Quais dos veículos informados aparecem citados no texto. Só confere nomes distintivos
 * (com mais de uma palavra, ou uma palavra longa e não ambígua) para evitar falsos positivos.
 */
export function findOutletMentions(text: string, outletNames: string[]): string[] {
  const haystack = fold(text);
  const hits: string[] = [];
  for (const name of outletNames) {
    const aliases = new Set([fold(cleanOutletName(name)), fold(name)]);
    for (const alias of aliases) {
      if (!alias || AMBIGUOUS.has(alias)) continue;
      if (!/\s/.test(alias) && alias.length < 8) continue;
      const re = new RegExp(`(?<![a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`);
      if (re.test(haystack)) {
        hits.push(name);
        break;
      }
    }
  }
  return hits;
}
