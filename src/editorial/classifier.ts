import { fold } from '@/lib/utils/text';
import { extractEntities } from '@/events/entities';
import type { AIProvider } from './ai/provider';

export interface ClassifyInput {
  title: string;
  description?: string | null;
  sourceCountry?: string | null;
}

export interface Classification {
  /** slug em categories (null = não classificado). */
  categorySlug: string | null;
  /** slugs em companies. */
  companies: string[];
  /** slugs em models. */
  models: string[];
}

export interface NewsClassifier {
  classify(input: ClassifyInput): Promise<Classification>;
}

export const CATEGORY_SLUGS = [
  'modelos-de-ia', 'open-source', 'agentes', 'imagem', 'video', 'audio', 'robotica', 'pesquisa',
  'negocios', 'startups', 'investimentos', 'ferramentas', 'legislacao', 'ia-no-brasil',
] as const;

/** Regras em ordem de prioridade (desempate). Padrões sobre texto sem acentos, minúsculo. */
const RULES: { slug: (typeof CATEGORY_SLUGS)[number]; re: RegExp }[] = [
  { slug: 'legislacao', re: /\b(regras?|sanciona\w*|governador|leis?|laws?|rules|regulat\w*|regulament\w*|legislac\w*|\bleis?\b|projeto de lei|ai act|senate|senado|congress\w*|lawsuit|copyright|direitos autorais|executive order|lgpd|anpd|bill\b|ban\b|proib\w*)/ },
  { slug: 'investimentos', re: /\b(funding|raises?|raised|valuation|investimento\w*|invest\w*|aporte|rodada|series [a-e]\b|serie [a-e]\b|bilh\w+|billion|capex|ipo)\b/ },
  { slug: 'startups', re: /\b(startups?|founders?|fundador\w*|y combinator|seed round)\b/ },
  { slug: 'negocios', re: /\b(acquir\w*|acquisition|adquir\w*|aquisic\w*|parceria|partnership|receita|revenue|lucro|layoffs?|demiss\w*|mercado|market|ceo|contrat\w*)\b/ },
  { slug: 'pesquisa', re: /\b(paper|research|researchers?|benchmark\w*|study|studies|estudo\w*|pesquisa\w*|arxiv|cientista\w*|scientists?|dataset)\b/ },
  { slug: 'robotica', re: /\b(robot\w*|robo\w*|humanoid\w*|humanoide\w*|autonomous (?:driving|vehicles?)|waymo|optimus|self-driving|carros? autonomos?|embodied)\b/ },
  { slug: 'video', re: /\b(videos?|sora|veo|runway|kling|luma)\b/ },
  { slug: 'imagem', re: /\b(images?|imagens?|imagem|midjourney|dall-?e|stable diffusion|flux|photo\w*|fotos?|image generation)\b/ },
  { slug: 'audio', re: /\b(voice|voz|vozes|audio|speech|music|musica|text-to-speech|tts|elevenlabs|suno|podcast\w*)\b/ },
  { slug: 'agentes', re: /\b(agents?|agentes?|agentic|agentico\w*|mcp|computer use|autonomous agents?|codex|claude code|operator)\b/ },
  { slug: 'open-source', re: /\b(open[- ]?source|open[- ]?weights?|codigo aberto|llama|gemma|hugging ?face|apache 2)\b/ },
  { slug: 'modelos-de-ia', re: /\b(models?|modelos?|gpt-?\d\S*|claude \w+|gemini \d\S*|llms?|grok \d|o[134]\b|launch\w*|lanca\w*|releases?|unveils?|apresenta\w*)\b/ },
  { slug: 'ferramentas', re: /\b(app|apps|tools?|ferramentas?|features?|recursos?|plugins?|extensions?|extensao|assistants?|assistentes?|api|sdk|update\w*|atualiza\w*)\b/ },
];

const BR_RE = /\b(brasil|brasileir\w*|lgpd|anpd|pbia|sao paulo|rio de janeiro|brasilia)\b/;

/** Classificador sem LLM: regras por palavra-chave + dicionário de entidades. */
export class KeywordClassifier implements NewsClassifier {
  async classify({ title, description, sourceCountry }: ClassifyInput): Promise<Classification> {
    const t = fold(title);
    const d = fold(description ?? '');
    const scores = new Map<string, number>();
    RULES.forEach((rule, idx) => {
      let s = 0;
      if (rule.re.test(t)) s += 2;
      if (rule.re.test(d)) s += 1;
      // pequeno bônus por prioridade para desempate estável
      if (s) scores.set(rule.slug, s + (RULES.length - idx) / 100);
    });
    if (BR_RE.test(`${t} ${d}`)) scores.set('ia-no-brasil', 2.5);
    else if (sourceCountry === 'BR') scores.set('ia-no-brasil', (scores.get('ia-no-brasil') ?? 0) + 0.5);

    const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
    const ent = extractEntities(`${title} ${description ?? ''}`);
    return { categorySlug: best?.[0] ?? null, companies: ent.companies, models: ent.models };
  }
}

/** Classificador com LLM; se falhar, cai para o KeywordClassifier (nunca trava o pipeline). */
export class LLMClassifier implements NewsClassifier {
  constructor(private readonly provider: AIProvider, private readonly fallback: NewsClassifier = new KeywordClassifier()) {}

  async classify(input: ClassifyInput): Promise<Classification> {
    try {
      const res = await this.provider.generate({
        json: true,
        temperature: 0,
        maxTokens: 200,
        system: 'Você classifica notícias de IA. Responda apenas JSON: {"category": string|null}.',
        prompt: `Categorias válidas: ${CATEGORY_SLUGS.join(', ')}.\nTítulo: ${input.title}\nDescrição: ${input.description ?? ''}`,
      });
      const parsed = JSON.parse(res.text) as { category?: string | null };
      const base = await this.fallback.classify(input); // entidades continuam vindo do dicionário
      const slug = (CATEGORY_SLUGS as readonly string[]).includes(parsed.category ?? '') ? parsed.category! : base.categorySlug;
      return { ...base, categorySlug: slug };
    } catch {
      return this.fallback.classify(input);
    }
  }
}
