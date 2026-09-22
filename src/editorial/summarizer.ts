import { truncate } from '@/lib/utils/text';
import type { AIProvider } from './ai/provider';

export interface ArticleSummarizer {
  summarize(text: string, maxChars?: number): Promise<string>;
}

/** Sem LLM: recorte limpo do texto (resumo extrativo trivial). */
export class BasicSummarizer implements ArticleSummarizer {
  async summarize(text: string, maxChars = 280): Promise<string> {
    return truncate(text.replace(/\s+/g, ' ').trim(), maxChars);
  }
}

export class LLMSummarizer implements ArticleSummarizer {
  constructor(private readonly provider: AIProvider, private readonly fallback: ArticleSummarizer = new BasicSummarizer()) {}

  async summarize(text: string, maxChars = 280): Promise<string> {
    try {
      const res = await this.provider.generate({
        temperature: 0.2,
        maxTokens: 300,
        system: 'Você é editor de um portal brasileiro de notícias sobre IA. Escreva em português do Brasil, tom jornalístico, factual, sem inventar informações.',
        prompt: `Resuma em até ${maxChars} caracteres, em uma ou duas frases:\n\n${text}`,
      });
      return truncate(res.text.trim(), maxChars);
    } catch {
      return this.fallback.summarize(text, maxChars);
    }
  }
}
