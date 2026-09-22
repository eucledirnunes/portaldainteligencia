export interface Member {
  reliability: number; // 1..5
  isPrimary: boolean;
  publishedAt: Date;
}

/**
 * importance: quão relevante é o acontecimento (fonte primária + nº de fontes + confiabilidade).
 * trend: atividade recente (cada fonte pesa mais quanto mais nova; decai com meia-vida de 12h).
 */
export function computeScores(members: Member[], now = new Date()): { importance: number; trend: number } {
  if (!members.length) return { importance: 0, trend: 0 };
  const rel = members.reduce((s, m) => s + m.reliability / 5, 0) / members.length;
  const hasPrimary = members.some((m) => m.isPrimary);
  const importance = Math.min(100, (hasPrimary ? 30 : 0) + Math.log2(1 + members.length) * 20 + rel * 20);
  const trend = members.reduce((s, m) => {
    const ageH = Math.max(0, (now.getTime() - m.publishedAt.getTime()) / 3_600_000);
    return s + (m.reliability / 5) * Math.pow(0.5, ageH / 12);
  }, 0);
  return { importance: Math.round(importance * 10) / 10, trend: Math.round(trend * 100) / 100 };
}
