import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/data/portal';
import { SITE } from '@/lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, companies, models } = await getSitemapEntries();
  const u = (p: string) => `${SITE.url}${p}`;
  return [
    { url: u('/'), changeFrequency: 'hourly', priority: 1 },
    { url: u('/ultimas'), changeFrequency: 'hourly', priority: 0.9 },
    { url: u('/radar'), changeFrequency: 'hourly', priority: 0.7 },
    { url: u('/fontes'), changeFrequency: 'daily', priority: 0.4 },
    ...articles.map((a) => ({ url: u(`/noticias/${a.slug}`), lastModified: a.updated_at, priority: 0.8 })),
    ...companies.map((c) => ({ url: u(`/empresas/${c.slug}`), changeFrequency: 'daily' as const, priority: 0.6 })),
    ...models.map((m) => ({ url: u(`/modelos/${m.slug}`), changeFrequency: 'daily' as const, priority: 0.6 })),
  ];
}
