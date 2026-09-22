/**
 * Renderizador mínimo e seguro do conteúdo do artigo: blocos separados por linha em branco;
 * "## " = intertítulo; linhas iniciadas por "- " = lista. Nada de HTML cru (React escapa tudo).
 */
export function ArticleBody({ content }: { content: string | null }) {
  if (!content) return null;
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-body">
      {blocks.map((b, i) => {
        if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>;
        const lines = b.split('\n');
        if (lines.every((l) => l.startsWith('- '))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
