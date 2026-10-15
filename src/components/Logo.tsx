import Link from 'next/link';
import { SITE } from '@/lib/site';

/** Marca do design (três nós conectados) com o nome do portal. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="4" y="4" width="32" height="32" rx="8" fill="#0A0E17" />
      <circle cx="15" cy="15" r="3.5" fill="#38BDF8" />
      <circle cx="25" cy="15" r="3.5" fill="#6366F1" />
      <circle cx="20" cy="25" r="3.5" fill="#10B981" />
      <path d="M15 15L25 15L20 25Z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" strokeOpacity=".6" fill="none" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex flex-col items-start leading-none" aria-label={`${SITE.name} — página inicial`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-news-aivvo.png" alt={SITE.name} width={1528} height={237} className="h-7 w-auto sm:h-8" />
      <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted">{SITE.tagline}</span>
    </Link>
  );
}
