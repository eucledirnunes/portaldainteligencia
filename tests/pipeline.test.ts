import { describe, expect, it } from 'vitest';
import { canonicalizeUrl } from '@/lib/utils/url';
import { normalizeItem } from '@/ingestion/normalizers/normalize';
import { filterNewItems } from '@/ingestion/processors/dedupe';
import { isAiRelated } from '@/ingestion/processors/ai-filter';
import { isAllowedByRobots } from '@/ingestion/scraper/robots';
import { TitleEntityMatcher, type EventCandidate } from '@/events/matcher';
import { extractEntities } from '@/events/entities';
import { computeScores } from '@/events/scoring';
import { KeywordClassifier } from '@/editorial/classifier';

const src = { language: 'en' };
const now = new Date('2026-09-21T12:00:00Z');

describe('canonicalizeUrl', () => {
  it('remove tracking, www, hash, barra final e força https', () => {
    expect(canonicalizeUrl('http://www.Example.com/post/?utm_source=x&b=2&a=1#top')).toBe('https://example.com/post?a=1&b=2');
  });
});

describe('normalizeItem', () => {
  it('normaliza e gera hash estável independente de URL/tracking', () => {
    const a = normalizeItem(src, { url: 'https://x.com/a?utm_source=tw', title: '  <b>OpenAI lança GPT-5</b> ', descriptionHtml: '<p>Novo modelo</p>' }, now)!;
    const b = normalizeItem(src, { url: 'https://x.com/b', title: 'OpenAI lança GPT-5', descriptionHtml: 'Novo  modelo' }, now)!;
    expect(a.title).toBe('OpenAI lança GPT-5');
    expect(a.canonicalUrl).toBe('https://x.com/a');
    expect(a.contentHash).toBe(b.contentHash);
  });
  it('rejeita itens sem título ou URL válida e limita datas futuras', () => {
    expect(normalizeItem(src, { url: 'nao-e-url', title: 'x' }, now)).toBeNull();
    expect(normalizeItem(src, { url: 'https://x.com/1', title: '' }, now)).toBeNull();
    expect(normalizeItem(src, { url: 'https://x.com/1', title: 'ok', publishedAt: '2030-01-01' }, now)!.publishedAt).toBe(now.toISOString());
  });
});

describe('filterNewItems', () => {
  const mk = (url: string, title: string, ext: string | null = null) => normalizeItem(src, { url, title, externalId: ext }, now)!;
  it('descarta duplicados no lote e já existentes', () => {
    const items = [mk('https://a.com/1', 'Um'), mk('https://a.com/1?utm_medium=x', 'Um'), mk('https://a.com/2', 'Dois', 'g2'), mk('https://a.com/3', 'Três')];
    const existing = { canonicalUrls: new Set(['https://a.com/3']), externalIds: new Set<string>(), hashes: new Set<string>() };
    const { fresh, skipped } = filterNewItems(items, existing);
    expect(fresh.map((i) => i.title)).toEqual(['Um', 'Dois']);
    expect(skipped).toBe(2);
  });
});

describe('isAiRelated', () => {
  it('filtra feeds generalistas', () => {
    expect(isAiRelated('Anthropic lança novo Claude')).toBe(true);
    expect(isAiRelated('Novo recurso de inteligência artificial no WhatsApp')).toBe(true);
    expect(isAiRelated('Samsung lança novo celular dobrável')).toBe(false);
    expect(isAiRelated('Como ficar sem pagar taxa bancária')).toBe(false);
  });
});

describe('robots.txt', () => {
  const robots = 'User-agent: *\nDisallow: /private\nAllow: /private/open\n\nUser-agent: SinapseBot\nDisallow: /blocked';
  it('respeita grupo específico, Allow mais específico e default liberado', () => {
    expect(isAllowedByRobots(robots, '/blocked/x', 'SinapseBot/0.1')).toBe(false);
    expect(isAllowedByRobots(robots, '/private/x', 'OutroBot/1')).toBe(false);
    expect(isAllowedByRobots(robots, '/private/open/x', 'OutroBot/1')).toBe(true);
    expect(isAllowedByRobots(robots, '/news', 'OutroBot/1')).toBe(true);
  });
});

describe('TitleEntityMatcher', () => {
  const matcher = new TitleEntityMatcher();
  const cand = (id: string, title: string, hoursAgo: number, url = 'https://o.com/' + id): EventCandidate => ({
    id, titles: [title], urls: [url], entities: (({ companies, models, versions }) => ({ companies, models, versions }))(extractEntities(title)),
    lastUpdatedAt: new Date(now.getTime() - hoursAgo * 3_600_000),
  });
  const input = (title: string, url = 'https://t.com/x') => ({ title, canonicalUrl: url, publishedAt: now });

  it('agrupa a mesma notícia em fontes/idiomas diferentes', () => {
    const c = [cand('e1', 'OpenAI launches GPT-5 with improved reasoning', 2), cand('e2', 'Nvidia reports record earnings', 1)];
    expect(matcher.findMatch(input('OpenAI lança GPT-5 com raciocínio melhorado'), c)?.eventId).toBe('e1');
    expect(matcher.findMatch(input('OpenAI unveils GPT-5, its most capable model'), c)?.eventId).toBe('e1');
  });
  it('não junta eventos diferentes da mesma empresa', () => {
    const c = [cand('e1', 'OpenAI launches GPT-5 with improved reasoning', 2)];
    expect(matcher.findMatch(input('OpenAI raises new funding round at record valuation'), c)).toBeNull();
  });
  it('mesma empresa com assuntos distintos não agrupa', () => {
    const c = [cand('g', "New experts join Google's AI & Economy team", 2), cand('a', 'Amazon SageMaker HyperPod Inference Gateway', 2)];
    expect(matcher.findMatch(input('Google announces new experimental "CC" AI agent for families'), c)).toBeNull();
    expect(matcher.findMatch(input('Introducing Kimi K3 on Amazon Bedrock'), c)).toBeNull();
  });
  it('duas empresas em comum ainda agrupam', () => {
    const c = [cand('m', "Amazon doesn't trust Meta's Muse AI agent", 1)];
    expect(matcher.findMatch(input("Meta's AI agent has been blocked from using Amazon.com"), c)?.eventId).toBe('m');
  });
  it('mesma URL canônica sempre casa; fora da janela de tempo não', () => {
    expect(matcher.findMatch(input('Título totalmente diferente', 'https://o.com/e1'), [cand('e1', 'X', 200)])?.score).toBe(1);
    expect(matcher.findMatch(input('OpenAI launches GPT-5 with improved reasoning'), [cand('e1', 'OpenAI launches GPT-5 with improved reasoning', 200)])).toBeNull();
  });
});

describe('scoring', () => {
  it('mais fontes e fonte primária aumentam importância; trend decai com a idade', () => {
    const fresh = { reliability: 5, isPrimary: true, publishedAt: now };
    const old = { reliability: 5, isPrimary: true, publishedAt: new Date(now.getTime() - 48 * 3_600_000) };
    expect(computeScores([fresh, fresh], now).importance).toBeGreaterThan(computeScores([fresh], now).importance);
    expect(computeScores([fresh], now).trend).toBeGreaterThan(computeScores([old], now).trend);
  });
});

describe('KeywordClassifier', () => {
  const c = new KeywordClassifier();
  it('classifica categoria e extrai empresas/modelos', async () => {
    const r = await c.classify({ title: 'Anthropic launches Claude Opus with new agents' });
    expect(r.companies).toContain('anthropic');
    expect(r.models).toContain('claude');
    expect(r.categorySlug).toBeTruthy();
    expect((await c.classify({ title: 'Senado aprova projeto de lei sobre IA' })).categorySlug).toBe('legislacao');
    expect((await c.classify({ title: 'Startup brasileira de IA lança produto', sourceCountry: 'BR' })).categorySlug).toBe('ia-no-brasil');
    expect((await c.classify({ title: 'Nova pesquisa mostra benchmark de modelos' })).categorySlug).toBe('pesquisa');
  });
});

import { looksPortuguese, stripPromo } from '@/lib/utils/text';
import { LLMArticleGenerator, BasicArticleGenerator } from '@/editorial/generator';
import type { AIProvider } from '@/editorial/ai/provider';

describe('idioma pt-BR e limpeza', () => {
  it('detecta português vs inglês', () => {
    expect(looksPortuguese('A OpenAI anunciou um novo modelo que promete melhorar o raciocínio das respostas para os usuários')).toBe(true);
    expect(looksPortuguese('OpenAI forms math advisory group as its AI resolves more than 100 open problems in the field')).toBe(false);
  });
  it('remove frases promocionais coladas no texto', () => {
    const t = 'A Apple deve lançar um display. 📱 Veja as melhores promoções de celulares no WhatsApp do CT Ofertas A previsão encurta a janela.';
    const out = stripPromo(t);
    expect(out).toContain('A Apple deve lançar');
    expect(out).not.toMatch(/WhatsApp|promoções/);
  });
});

describe('LLMArticleGenerator', () => {
  const ctx = { title: 'OpenAI launches GPT-6', sources: [{ name: 'OpenAI', url: 'https://o.com/a', title: 'OpenAI launches GPT-6', description: 'A new model.', isPrimary: true, publishedAt: null }] };
  const fake = (texts: string[]): AIProvider => {
    let i = 0;
    return { name: 'fake', generate: async () => ({ text: texts[Math.min(i++, texts.length - 1)], model: 'x' }) };
  };
  const ptJson = JSON.stringify({ title: 'OpenAI lança o GPT-6 com foco em raciocínio', summary: 'A empresa apresentou o novo modelo, que promete respostas mais precisas para os usuários.', content: 'A OpenAI anunciou nesta segunda-feira o GPT-6, que segundo a empresa melhora o raciocínio.\n\nO modelo já está disponível para os assinantes.' });
  const enJson = JSON.stringify({ title: 'OpenAI launches GPT-6 with reasoning', summary: 'The company said the new model is more accurate and will be available for all users of the platform.', content: 'OpenAI announced the new model on Monday and said that it will be available to the users of the platform this week.' });

  it('aceita resposta em pt-BR', async () => {
    const g = await new LLMArticleGenerator(fake([ptJson])).generate(ctx);
    expect(g.generatedBy).toBe('fake');
    expect(g.title).toMatch(/lança/);
  });
  it('se vier em inglês, tenta de novo e aceita a segunda (pt)', async () => {
    const g = await new LLMArticleGenerator(fake([enJson, ptJson])).generate(ctx);
    expect(g.generatedBy).toBe('fake');
  });
  it('se continuar em inglês, recua para o básico (que o pipeline retém como rascunho)', async () => {
    const g = await new LLMArticleGenerator(fake([enJson, enJson]), new BasicArticleGenerator()).generate(ctx);
    expect(g.generatedBy).toBe('basic');
  });
});

import { isAdvertisement } from '@/ingestion/processors/ai-filter';

describe('propaganda e categorias (fallback por palavras-chave)', () => {
  it('detecta anúncios sem pegar notícias', () => {
    expect(isAdvertisement("Discover what's next: 5 days left to save up to $200 on your TechCrunch Disrupt 2026 ticket")).toBe(true);
    expect(isAdvertisement('Últimos dias para garantir ingressos com desconto para o evento')).toBe(true);
    expect(isAdvertisement('OpenAI lança novo modelo com raciocínio melhorado')).toBe(false);
    expect(isAdvertisement('California sanctions new rules for data center energy use')).toBe(false);
  });
  it('regras de data center vão para legislação, não investimentos', async () => {
    const c = new KeywordClassifier();
    expect((await c.classify({ title: 'California tightens rules on AI data center energy and water use' })).categorySlug).toBe('legislacao');
    expect((await c.classify({ title: 'Governador sanciona leis sobre uso de energia por centros de dados' })).categorySlug).toBe('legislacao');
  });
});

import { pickCover, buildCategoryCoverPrompt, POOL_SIZE, FALLBACK_CATEGORY } from '@/editorial/covers-pool';

describe('pool de capas por categoria', () => {
  const pool = new Map([
    ['modelos-de-ia', ['a.png', 'b.png', 'c.png', 'd.png']],
    [FALLBACK_CATEGORY, ['g.png']],
  ]);
  it('é determinístico: mesma matéria sempre pega a mesma capa', () => {
    const a = pickCover(pool, 'modelos-de-ia', 'artigo-123');
    const b = pickCover(pool, 'modelos-de-ia', 'artigo-123');
    expect(a).toBe(b);
    expect(pool.get('modelos-de-ia')).toContain(a);
  });
  it('usa o pool "geral" quando a categoria não tem pool', () => {
    expect(pickCover(pool, 'categoria-sem-capas', 'x')).toBe('g.png');
    expect(pickCover(pool, null, 'x')).toBe('g.png');
  });
  it('retorna null se nem "geral" existir', () => {
    expect(pickCover(new Map(), 'modelos-de-ia', 'x')).toBeNull();
  });
  it('distribui entre variações diferentes (não sempre a primeira)', () => {
    const picks = new Set(Array.from({ length: 30 }, (_, i) => pickCover(pool, 'modelos-de-ia', `artigo-${i}`)));
    expect(picks.size).toBeGreaterThan(1);
  });
  it('prompt de capa não menciona título de matéria específica e varia por índice', () => {
    const p0 = buildCategoryCoverPrompt('Negócios', 0);
    const p1 = buildCategoryCoverPrompt('Negócios', 1);
    expect(p0).not.toBe(p1);
    expect(p0.toLowerCase()).toContain('negócios'.toLowerCase());
  });
  it('POOL_SIZE é 4, conforme combinado', () => {
    expect(POOL_SIZE).toBe(4);
  });
});

import { formatMarketChange, formatMarketPrice, type MarketQuote } from '@/lib/market';

describe('formatação de cotações', () => {
  const stock: MarketQuote = { symbol: 'NVDA', label: 'NVIDIA', kind: 'stock', price: 227.38, changePercent: 1.58, currency: 'USD' };
  const forex: MarketQuote = { symbol: 'USD/BRL', label: 'Dólar', kind: 'forex', price: 5.3245, changePercent: -0.42, currency: 'BRL' };
  const metal: MarketQuote = { symbol: 'XAU/USD', label: 'Ouro', kind: 'metal', price: 3789.5, changePercent: 0, currency: 'USD' };

  it('formata preço com prefixo e casas certas por tipo de ativo', () => {
    expect(formatMarketPrice(stock)).toBe('$227.38');
    expect(formatMarketPrice(forex)).toBe('R$ 5.3245');
    expect(formatMarketPrice(metal)).toBe('$3789.50');
  });
  it('formata variação percentual com sinal', () => {
    expect(formatMarketChange(stock)).toBe('+1.58%');
    expect(formatMarketChange(forex)).toBe('-0.42%');
    expect(formatMarketChange(metal)).toBe('0.00%');
  });
});

import { detectEncoding } from '@/lib/utils/http';

describe('detectEncoding', () => {
  const bytes = (s: string) => new TextEncoder().encode(s);
  it('usa o charset do header Content-Type quando presente', () => {
    expect(detectEncoding(bytes('<xml/>'), 'application/xml; charset=ISO-8859-1')).toBe('iso-8859-1');
  });
  it('cai para o encoding declarado no prólogo XML sem header', () => {
    expect(detectEncoding(bytes('<?xml version="1.0" encoding="ISO-8859-1"?>'), 'application/xml')).toBe('iso-8859-1');
  });
  it('usa utf-8 por padrão quando nada é declarado', () => {
    expect(detectEncoding(bytes('<?xml version="1.0"?>'), null)).toBe('utf-8');
  });
  it('ignora encoding desconhecido/inválido e cai para utf-8', () => {
    expect(detectEncoding(bytes('<?xml version="1.0" encoding="x-bogus"?>'), null)).toBe('utf-8');
  });
});
