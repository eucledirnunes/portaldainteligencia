import { createAIProvider, NoopProvider, type AIProvider } from './ai';
import { KeywordClassifier, LLMClassifier, type NewsClassifier } from './classifier';
import { BasicArticleGenerator, LLMArticleGenerator, type ArticleGenerator } from './generator';
import { BasicSummarizer, LLMSummarizer, type ArticleSummarizer } from './summarizer';

export interface EditorialServices {
  provider: AIProvider;
  classifier: NewsClassifier;
  summarizer: ArticleSummarizer;
  generator: ArticleGenerator;
}

/** Composição: com provider configurado usa as versões LLM (com fallback), senão as básicas. */
export function createEditorialServices(provider: AIProvider = createAIProvider()): EditorialServices {
  if (provider instanceof NoopProvider) {
    return { provider, classifier: new KeywordClassifier(), summarizer: new BasicSummarizer(), generator: new BasicArticleGenerator() };
  }
  return {
    provider,
    classifier: new LLMClassifier(provider),
    summarizer: new LLMSummarizer(provider),
    generator: new LLMArticleGenerator(provider),
  };
}
