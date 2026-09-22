/**
 * Camada abstrata de LLM. O resto do sistema (classifier, summarizer, generator) só conhece
 * esta interface; trocar OpenAI/Claude/Gemini é configuração (AI_PROVIDER), não reescrita.
 */
export interface GenerateRequest {
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Pede saída JSON válida (cada provider usa o mecanismo nativo quando existe). */
  json?: boolean;
}

export interface GenerateResult {
  text: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AIProvider {
  readonly name: string;
  generate(req: GenerateRequest): Promise<GenerateResult>;
}

export class AIProviderNotConfiguredError extends Error {
  constructor(message = 'Nenhum provedor de IA configurado (defina AI_PROVIDER e a chave correspondente).') {
    super(message);
    this.name = 'AIProviderNotConfiguredError';
  }
}

/** Provider nulo: mantém o pipeline funcionando sem LLM (usa implementações básicas). */
export class NoopProvider implements AIProvider {
  readonly name = 'none';
  async generate(): Promise<GenerateResult> {
    throw new AIProviderNotConfiguredError();
  }
}
