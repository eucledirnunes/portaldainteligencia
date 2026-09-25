import Link from 'next/link';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

const TABS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/fontes', label: 'Fontes' },
  { href: '/admin/brutas', label: 'Notícias brutas' },
  { href: '/admin/eventos', label: 'Eventos' },
  { href: '/admin/artigos', label: 'Artigos' },
  { href: '/admin/capas', label: 'Capas' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-surface">{t.label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
