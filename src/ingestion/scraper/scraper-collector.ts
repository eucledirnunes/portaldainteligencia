import * as cheerio from 'cheerio';
import type { ScraperConfig, SourceRow } from '@/domain/types';
import { fetchText } from '@/lib/utils/http';
import { resolveUrl } from '@/lib/utils/url';
import type { FeedItem, SourceCollector } from '../types';
import { canFetch } from './robots';

/**
 * Scraper declarativo (seletores CSS em sources.config.scraper), usado SOMENTE quando não há RSS.
 * Regras: 1 requisição por execução, respeita robots.txt, UA identificável, sem tentativa
 * de burlar Cloudflare/paywall/anti-bot (se a fonte bloquear, a coleta falha e fica registrada).
 */
export class ScraperCollector implements SourceCollector {
  async collect(source: SourceRow): Promise<FeedItem[]> {
    const cfg = source.config.scraper;
    if (!cfg) throw new Error(`Fonte ${source.slug} sem config.scraper`);
    if (!(await canFetch(cfg.listing_url))) {
      throw new Error(`robots.txt não permite coletar ${cfg.listing_url}`);
    }
    const html = await fetchText(cfg.listing_url);
    return this.parseListing(html, cfg.listing_url, cfg);
  }

  parseListing(html: string, baseUrl: string, cfg: ScraperConfig): FeedItem[] {
    const $ = cheerio.load(html);
    const items: FeedItem[] = [];
    $(cfg.item_selector).each((_, el) => {
      const node = $(el);
      const link = cfg.link_selector ? node.find(cfg.link_selector).first() : node.is('a') ? node : node.find('a').first();
      const href = link.attr('href');
      const title = (cfg.title_selector ? node.find(cfg.title_selector).first().text() : link.text()).replace(/\s+/g, ' ').trim();
      if (!href || !title) return;
      const dateNode = cfg.date_selector ? node.find(cfg.date_selector).first() : null;
      const dateText = dateNode ? dateNode.attr('datetime') ?? dateNode.text() : null;
      const img = cfg.image_selector ? node.find(cfg.image_selector).first().attr('src') : undefined;
      items.push({
        url: resolveUrl(baseUrl, href),
        title,
        descriptionHtml: cfg.description_selector ? node.find(cfg.description_selector).first().text().trim() : null,
        imageUrl: img ? resolveUrl(baseUrl, img) : null,
        publishedAt: dateText ? dateText.trim() : null,
      });
    });
    return items;
  }
}
