// Filtro de relevância para feeds generalistas de tecnologia (sources.config.ai_filter).
const AI_PATTERN =
  /(?<![a-z0-9])(ai|ia|llm|llms|gpt|chatgpt|openai|anthropic|claude|gemini|grok|llama|mistral|deepseek|copilot|perplexity|nvidia|hugging ?face|midjourney|sora|deepmind|agentic|machine learning|deep learning|generative|generativ[ao]s?|artificial intelligence|intelig[eê]ncia artificial|aprendizado de m[aá]quina|redes? neura(?:l|is)|chatbots?|rob[oô]s?|humanoid[ea]s?)(?![a-z0-9])/i;

export function isAiRelated(title: string, description?: string | null): boolean {
  return AI_PATTERN.test(`${title} ${description ?? ''}`);
}

// Anúncios/promoções que não são notícia (ingressos, cupons, "X dias restantes"...). Conservador de propósito.
const AD_PATTERN =
  /(days? left|save up to|early[- ]bird|register now|promo code|discount code|coupon|black friday|ingressos? com desconto|últimos dias para|ultimos dias para|cupom|cupons|garanta (?:já )?seu ingresso|inscri[çc][õo]es abertas|oferta imperd)/i;

export function isAdvertisement(title: string, description?: string | null): boolean {
  return AD_PATTERN.test(`${title} ${description ?? ''}`);
}
