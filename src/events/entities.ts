import { fold } from '@/lib/utils/text';

/**
 * Dicionário de entidades (slug -> aliases). Os slugs batem com companies.slug / models.slug do seed.
 * Mantido em código para o matcher e o classificador funcionarem sem consultar o banco.
 */
export const COMPANY_ALIASES: Record<string, string[]> = {
  openai: ['openai', 'open ai', 'sam altman'],
  anthropic: ['anthropic', 'dario amodei'],
  google: ['google', 'deepmind', 'alphabet'],
  meta: ['meta ai', 'meta platforms', 'zuckerberg', 'meta'],
  microsoft: ['microsoft', 'azure', 'satya nadella'],
  nvidia: ['nvidia', 'jensen huang'],
  perplexity: ['perplexity'],
  mistral: ['mistral'],
  xai: ['xai', 'x.ai', 'elon musk'],
  'hugging-face': ['hugging face', 'huggingface'],
  runway: ['runway', 'runwayml'],
  elevenlabs: ['elevenlabs', 'eleven labs'],
  'stability-ai': ['stability ai', 'stable diffusion'],
  amazon: ['amazon', 'aws', 'bedrock'],
  deepseek: ['deepseek'],
};

export const MODEL_ALIASES: Record<string, string[]> = {
  gpt: ['gpt', 'o1', 'o3', 'o4'],
  chatgpt: ['chatgpt'],
  claude: ['claude', 'sonnet', 'opus', 'haiku'],
  gemini: ['gemini', 'gemma', 'veo', 'imagen'],
  grok: ['grok'],
  llama: ['llama'],
  deepseek: ['deepseek'],
};

export interface Entities {
  companies: string[];
  models: string[];
  /** Tokens com dígitos (versões: "5", "4.1", "gpt-5"), fortes para distinguir eventos. */
  versions: string[];
}

function aliasRegex(alias: string): RegExp {
  const esc = fold(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`);
}

const compile = (dict: Record<string, string[]>) =>
  Object.entries(dict).map(([slug, aliases]) => ({ slug, res: aliases.map(aliasRegex) }));
const COMPANY_RES = compile(COMPANY_ALIASES);
const MODEL_RES = compile(MODEL_ALIASES);

export function extractEntities(text: string): Entities {
  const t = fold(text);
  const match = (list: typeof COMPANY_RES) => list.filter((e) => e.res.some((r) => r.test(t))).map((e) => e.slug);
  const versions = [...new Set(t.match(/(?<![a-z0-9])\d+(?:\.\d+)?(?![a-z0-9])/g) ?? [])].filter((v) => v.length <= 4);
  return { companies: match(COMPANY_RES), models: match(MODEL_RES), versions };
}

export function entityKeys(e: Entities): Set<string> {
  return new Set([...e.companies.map((c) => `c:${c}`), ...e.models.map((m) => `m:${m}`), ...e.versions.map((v) => `v:${v}`)]);
}
