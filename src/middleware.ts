import { NextResponse, type NextRequest } from 'next/server';

/** Comparação em tempo (quase) constante para não vazar o tamanho do prefixo correto. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/**
 * /admin protegido por HTTP Basic (ADMIN_USER / ADMIN_PASSWORD).
 * Fail closed: sem as variáveis definidas, /admin responde 503. Troque por Supabase Auth quando houver equipe.
 */
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return new NextResponse('Admin desativado: defina ADMIN_USER e ADMIN_PASSWORD.', { status: 503 });

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(':');
      if (i >= 0 && safeEqual(decoded.slice(0, i), user) && safeEqual(decoded.slice(i + 1), pass)) {
        const res = NextResponse.next();
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        res.headers.set('Cache-Control', 'no-store');
        return res;
      }
    } catch {
      /* cai para 401 */
    }
  }
  return new NextResponse('Autenticação necessária.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin", charset="UTF-8"' } });
}

export const config = { matcher: ['/admin/:path*'] };
