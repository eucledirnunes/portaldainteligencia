import { CATEGORY_SLUGS } from '@/editorial/classifier';

/**
 * Redação de agentes de IA. Cada agente tem nome fixo e uma "beat" (cobertura):
 *  - agentes de empresa cobrem as notícias da respectiva empresa (ex.: Orion cobre a OpenAI);
 *  - quando a notícia não é de nenhuma dessas empresas (generalista), assume o agente da editoria.
 * O portal declara abertamente que são agentes de IA — não há repórteres humanos.
 */
export interface Agent {
  id: string;
  name: string;
  /** Texto curto: o que o agente cobre. */
  beat: string;
  kind: 'empresa' | 'editoria';
}

type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const COMPANY_AGENTS: (Agent & { company: string })[] = [
  { id: 'openai', company: 'openai', name: 'Orion', beat: 'Cobre a OpenAI', kind: 'empresa' },
  { id: 'anthropic', company: 'anthropic', name: 'Aurora', beat: 'Cobre a Anthropic', kind: 'empresa' },
  { id: 'google', company: 'google', name: 'Gael', beat: 'Cobre o Google e a DeepMind', kind: 'empresa' },
  { id: 'meta', company: 'meta', name: 'Marcos', beat: 'Cobre a Meta', kind: 'empresa' },
  { id: 'microsoft', company: 'microsoft', name: 'Mirela', beat: 'Cobre a Microsoft', kind: 'empresa' },
  { id: 'nvidia', company: 'nvidia', name: 'Nina', beat: 'Cobre a NVIDIA', kind: 'empresa' },
  { id: 'xai', company: 'xai', name: 'Xande', beat: 'Cobre a xAI', kind: 'empresa' },
  { id: 'deepseek', company: 'deepseek', name: 'Dante', beat: 'Cobre a DeepSeek', kind: 'empresa' },
  { id: 'mistral', company: 'mistral', name: 'Maya', beat: 'Cobre a Mistral', kind: 'empresa' },
  { id: 'amazon', company: 'amazon', name: 'Amanda', beat: 'Cobre a Amazon e a AWS', kind: 'empresa' },
];

const CATEGORY_AGENTS: Record<CategorySlug, Agent> = {
  'modelos-de-ia': { id: 'c-modelos', name: 'Téo', beat: 'Editoria de Modelos', kind: 'editoria' },
  'open-source': { id: 'c-open-source', name: 'Ravi', beat: 'Editoria de Open Source', kind: 'editoria' },
  agentes: { id: 'c-agentes', name: 'Ágata', beat: 'Editoria de Agentes', kind: 'editoria' },
  imagem: { id: 'c-imagem', name: 'Íris', beat: 'Editoria de Imagem', kind: 'editoria' },
  video: { id: 'c-video', name: 'Vera', beat: 'Editoria de Vídeo', kind: 'editoria' },
  audio: { id: 'c-audio', name: 'Sol', beat: 'Editoria de Áudio', kind: 'editoria' },
  robotica: { id: 'c-robotica', name: 'Rex', beat: 'Editoria de Robótica', kind: 'editoria' },
  pesquisa: { id: 'c-pesquisa', name: 'Lia', beat: 'Editoria de Pesquisa', kind: 'editoria' },
  negocios: { id: 'c-negocios', name: 'Nico', beat: 'Editoria de Negócios', kind: 'editoria' },
  startups: { id: 'c-startups', name: 'Stella', beat: 'Editoria de Startups', kind: 'editoria' },
  investimentos: { id: 'c-investimentos', name: 'Iago', beat: 'Editoria de Investimentos', kind: 'editoria' },
  ferramentas: { id: 'c-ferramentas', name: 'Fabi', beat: 'Editoria de Ferramentas', kind: 'editoria' },
  legislacao: { id: 'c-legislacao', name: 'Lúcio', beat: 'Editoria de Legislação', kind: 'editoria' },
  'ia-no-brasil': { id: 'c-ia-no-brasil', name: 'Bia', beat: 'Editoria de IA no Brasil', kind: 'editoria' },
};

export const GENERAL_AGENT: Agent = { id: 'geral', name: 'Gabi', beat: 'Generalista: assuntos sem editoria definida', kind: 'editoria' };

/** Todos os agentes, na ordem de exibição do painel de status. */
export const ALL_AGENTS: Agent[] = [...COMPANY_AGENTS, ...Object.values(CATEGORY_AGENTS), GENERAL_AGENT];

/** Agente responsável: o da empresa (se a notícia for de uma coberta) ou, senão, o da editoria. */
export function getAgentFor(categorySlug: string | null | undefined, companySlugs: string[] = []): Agent {
  const byCompany = COMPANY_AGENTS.find((a) => companySlugs.includes(a.company));
  if (byCompany) return byCompany;
  if (categorySlug && categorySlug in CATEGORY_AGENTS) return CATEGORY_AGENTS[categorySlug as CategorySlug];
  return GENERAL_AGENT;
}
