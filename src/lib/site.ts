export const SITE = {
  name: 'Blog da Inteligência',
  tagline: 'Notícias sobre IA',
  description: 'Portal brasileiro de notícias sobre Inteligência Artificial: modelos, empresas, ferramentas, pesquisa e IA no Brasil.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  /** As capas dos artigos são ilustrações geradas por IA (própria, não foto de terceiros — ver src/editorial/images.ts). */
} as const;

export const NAV = [
  { label: 'Últimas', href: '/ultimas' },
  { label: 'Radar', href: '/radar' },
  { label: 'Modelos', href: '/modelos' },
  { label: 'Empresas', href: '/empresas' },
  { label: 'Ferramentas', href: '/categoria/ferramentas' },
  { label: 'Pesquisa', href: '/categoria/pesquisa' },
  { label: 'IA no Brasil', href: '/categoria/ia-no-brasil' },
  { label: 'Fontes', href: '/fontes' },
] as const;
