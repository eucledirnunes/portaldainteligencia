import type { AIProvider, GenerateRequest, GenerateResult } from '../provider';

/** OpenAI Chat Completions via fetch (sem SDK). NÃO testado contra a API real neste MVP. */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  constructor(private readonly apiKey: string, private readonly model = process.env.OPENAI_MODEL || 'gpt-4o-mini') {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: req.temperature ?? 0.3,
        max_tokens: req.maxTokens,
        response_format: req.json ? { type: 'json_object' } : undefined,
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: data.choices[0]?.message.content ?? '',
      model: this.model,
      usage: { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens },
    };
  }
}
