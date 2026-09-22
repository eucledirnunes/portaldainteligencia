import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="kicker">404</p>
      <h1 className="headline mt-2 text-4xl">Página não encontrada</h1>
      <p className="mt-2 text-muted">O conteúdo pode ter sido movido ou arquivado.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2 text-sm font-medium text-bg">Voltar ao início</Link>
    </div>
  );
}
