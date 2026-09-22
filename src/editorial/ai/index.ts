import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { NoopProvider, type AIProvider } from './provider';

export * from './provider';

/** Escolhe o provider por AI_PROVIDER. Sem configuração completa devolve NoopProvider. */
export function createAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  switch ((env.AI_PROVIDER ?? '').toLowerCase()) {
    case 'openai':
      return env.OPENAI_API_KEY ? new OpenAIProvider(env.OPENAI_API_KEY) : new NoopProvider();
    case 'anthropic':
      return env.ANTHROPIC_API_KEY ? new AnthropicProvider(env.ANTHROPIC_API_KEY) : new NoopProvider();
    case 'gemini':
      return env.GEMINI_API_KEY ? new GeminiProvider(env.GEMINI_API_KEY) : new NoopProvider();
    default:
      return new NoopProvider();
  }
}
