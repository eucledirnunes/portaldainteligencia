import { CATEGORY_SLUGS } from '@/editorial/classifier';

/**
 * Assinaturas fixas por editoria. O portal é redigido por IA (ver seção "Bastidores da
 * redação" na home), mas cada editoria tem uma "pena" fixa para dar identidade ao texto,
 * como nas redações tradicionais que dividem repórteres por área.
 */
export interface Author {
  name: string;
  role: string;
}

type CategorySlug = (typeof CATEGORY_SLUGS)[number];

const AUTHOR_BY_CATEGORY: Record<CategorySlug, Author> = {
  'modelos-de-ia': { name: 'Rafael Nunes', role: 'Editoria de Modelos' },
  'open-source': { name: 'Marina Prado', role: 'Editoria de Open Source' },
  agentes: { name: 'Bruno Sales', role: 'Editoria de Agentes' },
  imagem: { name: 'Larissa Bittencourt', role: 'Editoria de Imagem' },
  video: { name: 'Diego Amaral', role: 'Editoria de Vídeo' },
  audio: { name: 'Camila Rezende', role: 'Editoria de Áudio' },
  robotica: { name: 'Thiago Moura', role: 'Editoria de Robótica' },
  pesquisa: { name: 'Fernanda Xavier', role: 'Editoria de Pesquisa' },
  negocios: { name: 'Eduardo Lacerda', role: 'Editoria de Negócios' },
  startups: { name: 'Juliana Ferraz', role: 'Editoria de Startups' },
  investimentos: { name: 'André Vasconcelos', role: 'Editoria de Investimentos' },
  ferramentas: { name: 'Patrícia Souza', role: 'Editoria de Ferramentas' },
  legislacao: { name: 'Renato Cardoso', role: 'Editoria de Legislação' },
  'ia-no-brasil': { name: 'Beatriz Almeida', role: 'Editoria de IA no Brasil' },
};

/** Assinatura padrão para matérias sem categoria definida. */
const DEFAULT_AUTHOR: Author = { name: 'Redação', role: 'Radar de IA' };

export function getAuthorForCategory(categorySlug: string | null | undefined): Author {
  if (categorySlug && categorySlug in AUTHOR_BY_CATEGORY) return AUTHOR_BY_CATEGORY[categorySlug as CategorySlug];
  return DEFAULT_AUTHOR;
}
