import Parser from 'rss-parser';
import type { SourceRow } from '@/domain/types';
import { fetchXmlText } from '@/lib/utils/http';
import type { FeedItem, SourceCollector } from '../types';

type MediaNode = { $?: { url?: string; medium?: string } };
type CustomItem = {
  'content:encoded'?: string;
  'media:content'?: MediaNode | MediaNode[];
  'media:thumbnail'?: MediaNode | MediaNode[];
  creator?: string;
};

const parser = new Parser<Record<string, never>, CustomItem>({
  customFields: { item: ['content:encoded', 'media:content', 'media:thumbnail', ['dc:creator', 'creator']] },
});

const first = <T>(v: T | T[] | undefined): T | undefined => (Array.isArray(v) ? v[0] : v);

function pickImage(item: Parser.Item & CustomItem): string | null {
  const enc = item.enclosure;
  if (enc?.url && (!enc.type || enc.type.startsWith('image'))) return enc.url;
  const media = first(item['media:content'])?.$?.url ?? first(item['media:thumbnail'])?.$?.url;
  if (media) return media;
  const html = item['content:encoded'] ?? item.content ?? '';
  return /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1] ?? null;
}

export class RssCollector implements SourceCollector {
  async collect(source: SourceRow): Promise<FeedItem[]> {
    if (!source.feed_url) throw new Error(`Fonte ${source.slug} sem feed_url`);
    return this.collectUrl(source.feed_url);
  }

  async collectUrl(feedUrl: string): Promise<FeedItem[]> {
    const xml = await fetchXmlText(feedUrl, {
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' },
    });
    const feed = await parser.parseString(xml);
    return feed.items.map((it) => ({
      externalId: it.guid ?? null,
      url: it.link ?? '',
      title: it.title ?? '',
      descriptionHtml: it.contentSnippet ?? it.summary ?? it.content ?? null,
      contentHtml: it['content:encoded'] ?? it.content ?? null,
      author: typeof it.creator === 'string' ? it.creator : null,
      imageUrl: pickImage(it),
      publishedAt: it.isoDate ?? it.pubDate ?? null,
      categories: it.categories ?? [],
    }));
  }
}
