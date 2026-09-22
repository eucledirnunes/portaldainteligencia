import type { AIProvider, GenerateRequest, GenerateResult } from '../provider';

/** Gemini generateContent via fetch (sem SDK). NÃO testado contra a API real neste MVP. */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  constructor(private readonly apiKey: string, private readonly model = process.env.GEMINI_MODEL || 'gemini-2.0-flash') {}

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify({
        systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          temperature: req.temperature ?? 0.3,
          maxOutputTokens: req.maxTokens,
          responseMimeType: req.json ? 'application/json' : undefined,
        },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    return {
      text: data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '',
      model: this.model,
      usage: { inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount },
    };
  }
}
