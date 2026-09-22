import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SITE } from '@/lib/site';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: {
    siteName: SITE.name, locale: 'pt_BR', type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#F8F9FF' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <Header />
        <main className="mx-auto min-h-[60vh] w-full max-w-page px-4 pb-16 pt-6 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
