import { looksPortuguese, stripPromo, truncate } from '@/lib/utils/text';
import type { AIProvider } from './ai/provider';
import { CATEGORY_SLUGS } from './classifier';

export interface SourceContext {
  name: string;
  url: string;
  title: string;
  description: string | null;
  /** Trecho do texto original (limpo), para o LLM ter fatos além da descrição. */
  excerpt?: string | null;
  language?: string | null;
  isPrimary: boolean;
  publishedAt: string | null;
}

export interface EventContext {
  title: string;
  sources: SourceContext[]; // lead primeiro
}

export interface GeneratedArticle {
  title: string;
  subtitle: string | null;
  summary: string;
  /** Blocos separados por linha em branco; "## " = subtítulo; linhas "- " = lista. */
  content: string;
  seoTitle: string;
  seoDescription: string;
  generatedBy: string;
  /** Categoria decidida pelo LLM (slug de categories) ou null se o gerador não classifica. */
  categorySlug?: string | null;
  /** false = propaganda/cupom/evento comercial/sem relação com IA: não deve ser publicada. */
  relevant?: boolean;
}

export interface ArticleGenerator {
  generate(ctx: EventContext): Promise<GeneratedArticle>;
}

/**
 * Gerador sem LLM: não copia o texto das fontes além de trechos curtos (descrições/lead)
 * e sempre atribui cada informação à fonte. Serve para o pipeline funcionar de ponta a ponta;
 * a redação própria é responsabilidade do LLMArticleGenerator (etapa seguinte).
 */
export class BasicArticleGenerator implements ArticleGenerator {
  async generate(ctx: EventContext): Promise<GeneratedArticle> {
    const [lead, ...others] = ctx.sources;
    const summary = truncate(lead?.description ?? ctx.title, 280);
    const blocks: string[] = [];
    if (lead?.description) blocks.push(`${lead.description} (${lead.name})`);
    if (others.length) {
      blocks.push('## O que outras fontes reportam');
      blocks.push(others.map((s) => `- ${s.name}: ${s.description ? truncate(s.description, 200) : s.title}`).join('\n'));
    }
    blocks.push('O texto acima resume o que as fontes publicaram. Consulte os links originais abaixo para a matéria completa.');
    return {
      title: ctx.title,
      subtitle: null,
      summary,
      content: blocks.join('\n\n'),
      seoTitle: truncate(ctx.title, 60),
      seoDescription: truncate(summary, 155),
      generatedBy: 'basic',
    };
  }
}

const CATEGORY_HELP =
  'modelos-de-ia (lançamento/atualização de modelos), open-source, agentes, imagem, video, audio, robotica, pesquisa (papers, estudos, benchmarks), ' +
  'negocios (parcerias, aquisições, receita, mercado), startups, investimentos (rodadas, valuation, aportes, capex), ferramentas (produtos e recursos para usuários), ' +
  'legislacao (leis, regras, regulação, tribunais, governos), ia-no-brasil (Brasil: empresas, governo, mercado, leis brasileiras)';

const SYSTEM_PROMPT =
  'Você é repórter e editor de um portal brasileiro de notícias sobre Inteligência Artificial. ' +
  'REGRA ABSOLUTA: escreva SEMPRE em português do Brasil, mesmo que as fontes estejam em inglês ou outro idioma: traduza título, subtítulo e todo o texto. ' +
  'Use SOMENTE fatos presentes nas fontes; não invente números, datas, nomes ou citações. Se as fontes divergirem, diga. ' +
  'Tom jornalístico neutro: NÃO use adjetivos promocionais nem verbos de hype ("revolucionário", "revolucionando", "incrível", "histórico"); ' +
  'atribua alegações de marketing à empresa ("segundo a empresa, ..."). ' +
  'Ignore propaganda, cupons, ofertas e chamadas para redes sociais. Não copie frases das fontes: reescreva com suas palavras. ' +
  'DIREITO AUTORAL: fatos podem ser relatados, a redação das fontes não. Não siga a ordem nem a estrutura de nenhuma fonte, e nunca reescreva parágrafo por parágrafo. ' +
  'Organize por relevância para o leitor brasileiro: o que aconteceu, por que importa e o que pode mudar para empresas e usuários no Brasil. ' +
  'No máximo UMA citação literal curta (até 20 palavras) por matéria, entre aspas e atribuída; todo o resto com suas palavras. ' +
  'Termine com um parágrafo curto de contexto e impacto, deixando claro o que é inferência ("tende a", "pode") e sem afirmar fatos que não estejam nas fontes. ' +
  'Preserve nomes próprios, produtos e termos técnicos (ex.: GPT-5, Claude, MCP, RAG). Cite a origem no texto ("segundo a OpenAI"). ' +
  'TÍTULO: informativo, até 110 caracteres, em CAIXA DE FRASE como os jornais brasileiros (só a primeira palavra e nomes próprios com inicial maiúscula; ' +
  'ex.: "Meta lança app Muse e amplia coleta de dados de usuários", NUNCA "Meta Lança App Muse e Amplia Coleta de Dados"). ' +
  'CATEGORIA: escolha exatamente uma entre: ' + CATEGORY_HELP + '. ' +
  'RELEVÂNCIA: "relevant" deve ser false se o assunto for propaganda, venda de ingressos/cursos, cupom/desconto, vaga de emprego, evento comercial ou não tiver relação real com IA; caso contrário true. ' +
  'Responda somente JSON: {"title","subtitle","summary","content","seoTitle","seoDescription","category","relevant"}. ' +
  'summary até 280 caracteres; seoDescription até 155; content com 3 a 6 parágrafos separados por linha em branco ("## " para intertítulo só se houver 4+ parágrafos).';

/** Redação com LLM em pt-BR, restrita aos fatos das fontes. Se o resultado não for português, tenta de novo e depois recua para o gerador básico. */
export class LLMArticleGenerator implements ArticleGenerator {
  constructor(private readonly provider: AIProvider, private readonly fallback: ArticleGenerator = new BasicArticleGenerator()) {}

  private buildPrompt(ctx: EventContext): string {
    const sources = ctx.sources
      .slice(0, 5)
      .map((s, i) => {
        const parts = [`[${i + 1}] ${s.name}${s.isPrimary ? ' (fonte primária)' : ''}${s.language ? ` — idioma: ${s.language}` : ''}`, `Título: ${s.title}`];
        if (s.description) parts.push(`Resumo: ${stripPromo(s.description)}`);
        if (s.excerpt) parts.push(`Trecho do texto: ${s.excerpt}`);
        parts.push(`URL: ${s.url}`);
        return parts.join('\n');
      })
      .join('\n\n');
    return `Escreva a matéria em português do Brasil sobre este acontecimento, a partir das fontes:\n\n${sources}`;
  }

  async generate(ctx: EventContext): Promise<GeneratedArticle> {
    let prompt = this.buildPrompt(ctx);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.provider.generate({ json: true, temperature: 0.3, maxTokens: 1800, system: SYSTEM_PROMPT, prompt });
        const j = JSON.parse(res.text) as Partial<GeneratedArticle> & { category?: string };
        if (!j.title || !j.content || !j.summary) throw new Error('resposta incompleta');
        if (!looksPortuguese(`${j.title} ${j.summary} ${j.content}`)) {
          prompt += '\n\nATENÇÃO: sua resposta anterior não estava em português do Brasil. Reescreva TUDO em português do Brasil.';
          continue;
        }
        return {
          title: j.title.trim(),
          subtitle: j.subtitle?.trim() || null,
          summary: truncate(j.summary.trim(), 280),
          content: j.content.trim(),
          seoTitle: truncate((j.seoTitle ?? j.title).trim(), 60),
          seoDescription: truncate((j.seoDescription ?? j.summary).trim(), 155),
          generatedBy: this.provider.name,
          categorySlug: (CATEGORY_SLUGS as readonly string[]).includes(String(j.category)) ? String(j.category) : null,
          relevant: j.relevant !== false,
        };
      } catch (e) {
        console.error(`LLMArticleGenerator: ${e instanceof Error ? e.message : e}`);
        break;
      }
    }
    return this.fallback.generate(ctx);
  }
}
