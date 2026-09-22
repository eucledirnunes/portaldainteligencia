import type { AIProvider, GenerateRequest, GenerateResult } from '../provider';

/** Anthropic Messages API via fetch (sem SDK). NÃO testado contra a API real neste MVP. */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  constructor(private readonly apiKey: string, private readonly model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001') {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.3,
        system: [req.system, req.json ? 'Responda somente com JSON válido, sem texto adicional.' : ''].filter(Boolean).join('\n'),
        messages: [{ role: 'user', content: req.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };
    return {
      text: data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''),
      model: this.model,
      usage: { inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens },
    };
  }
}
