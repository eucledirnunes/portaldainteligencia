import { canonicalizeUrl } from '@/lib/utils/url';
import { entityKeys, extractEntities, type Entities } from './entities';
import { dice, jaccard, tokenize } from './similarity';

/** Artigo bruto que precisa ser associado a um evento. */
export interface MatchInput {
  title: string;
  canonicalUrl: string;
  publishedAt: Date;
}

/** Evento existente, com o que o matcher precisa para comparar. */
export interface EventCandidate {
  id: string;
  /** Títulos de todos os artigos brutos já ligados ao evento (mais o título do próprio evento). */
  titles: string[];
  urls: string[];
  entities: Entities;
  lastUpdatedAt: Date;
}

export interface MatchResult {
  eventId: string;
  score: number;
}

/**
 * Contrato do EventMatcher. Hoje: TitleEntityMatcher (heurística barata).
 * Amanhã: EmbeddingEventMatcher (pgvector) implementa a mesma interface sem mudar o clusterer.
 */
export interface EventMatcher {
  readonly name: string;
  findMatch(input: MatchInput, candidates: EventCandidate[]): Promise<MatchResult | null> | MatchResult | null;
}

export interface TitleEntityMatcherOptions {
  /** Janela máxima entre a notícia e a última atividade do evento. */
  windowHours: number;
  /** Score mínimo para anexar a um evento existente. */
  threshold: number;
}

const DEFAULTS: TitleEntityMatcherOptions = { windowHours: 72, threshold: 0.6 };

export class TitleEntityMatcher implements EventMatcher {
  readonly name = 'title-entity-v1';
  private readonly opts: TitleEntityMatcherOptions;

  constructor(opts: Partial<TitleEntityMatcherOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  score(input: MatchInput, c: EventCandidate): number {
    // 1) Mesma URL canônica: é a mesma matéria.
    const url = canonicalizeUrl(input.canonicalUrl);
    if (c.urls.some((u) => canonicalizeUrl(u) === url)) return 1;

    // 2) Proximidade temporal.
    const hours = Math.abs(input.publishedAt.getTime() - c.lastUpdatedAt.getTime()) / 3_600_000;
    if (hours > this.opts.windowHours) return 0;

    // 3) Similaridade de título (melhor título do evento) + entidades em comum.
    const tokens = tokenize(input.title);
    const titleSim = Math.max(0, ...c.titles.map((t) => dice(tokens, tokenize(t))));
    const inputEntities = extractEntities(input.title);
    const entSim = jaccard(entityKeys(inputEntities), entityKeys(c.entities));

    // Sem entidade em comum só aceita títulos quase idênticos; e só entidades (sem texto parecido) não basta.
    if (entSim === 0 && titleSim < 0.8) return 0;
    if (titleSim < 0.3) return 0;

    // Evidência forte = modelo/versão em comum ou 2+ empresas em comum. Só "mesma empresa" exige títulos bem parecidos.
    const a = entityKeys(inputEntities);
    const shared = [...entityKeys(c.entities)].filter((k) => a.has(k));
    const strong = shared.some((k) => !k.startsWith('c:')) || shared.length >= 2;
    if (!strong && titleSim < 0.5) return 0;

    // Pesos iguais: paráfrases em outro idioma ("lança"/"launches") têm dice baixo mas entidades idênticas.
    const timeFactor = 1 - 0.3 * Math.min(1, hours / this.opts.windowHours);
    return (0.5 * titleSim + 0.5 * entSim) * timeFactor;
  }

  findMatch(input: MatchInput, candidates: EventCandidate[]): MatchResult | null {
    let best: MatchResult | null = null;
    for (const c of candidates) {
      const score = this.score(input, c);
      if (score >= this.opts.threshold && (!best || score > best.score)) best = { eventId: c.id, score };
    }
    return best;
  }
}
