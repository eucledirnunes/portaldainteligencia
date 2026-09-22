import Link from 'next/link';
import { SITE } from '@/lib/site';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-10 bg-low">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-md text-sm text-muted">
            {SITE.tagline}. As matérias contextualizam o que foi publicado por fontes originais, e cada uma lista os links utilizados.
          </p>
        </div>
        <nav aria-label="Rodapé: seções">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Seções</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/ultimas" className="hover:text-ink">Últimas</Link></li>
            <li><Link href="/radar" className="hover:text-ink">Radar de assuntos em alta</Link></li>
            <li><Link href="/modelos" className="hover:text-ink">Modelos</Link></li>
            <li><Link href="/empresas" className="hover:text-ink">Empresas</Link></li>
          </ul>
        </nav>
        <nav aria-label="Rodapé: transparência">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Transparência</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/fontes" className="hover:text-ink">Fontes monitoradas</Link></li>
            <li><Link href="/sitemap.xml" className="hover:text-ink">Mapa do site</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto max-w-page px-4 pb-8 font-mono text-[0.68rem] text-muted sm:px-6">
        © {new Date().getFullYear()} {SITE.name}. Marcas e conteúdos originais pertencem aos respectivos titulares.
      </div>
    </footer>
  );
}
