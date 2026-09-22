import { createServiceClient } from '@/lib/supabase/clients';
import { RssCollector } from './rss/rss-collector';
import { normalizeItem } from './normalizers/normalize';
import { runIngestion } from './run';

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const value = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  // --dry-run --feed <url>: busca e normaliza um feed SEM banco (para validar novas fontes).
  if (flag('dry-run')) {
    const feed = value('feed');
    if (!feed) throw new Error('Uso: npm run ingest:dry -- --feed <url-do-rss>');
    const items = (await new RssCollector().collectUrl(feed))
      .map((i) => normalizeItem({ language: 'en' }, i))
      .filter((i): i is NonNullable<typeof i> => i !== null);
    console.log(`${items.length} itens normalizados. Amostra:`);
    const sample = items.slice(0, 3).map((i) => ({ ...i, content: i.content ? `[${i.content.length} chars]` : null }));
    console.log(JSON.stringify(sample, null, 2));
    return;
  }
  const only = value('source')?.split(',');
  const results = await runIngestion(createServiceClient(), { only });
  for (const r of results) {
    const err = r.error ? ` :: ${r.error}` : '';
    console.log(
      `${r.ok ? 'OK ' : 'ERR'} ${r.source.padEnd(24)} fetched=${r.fetched} new=${r.inserted} dup=${r.skipped} ignored=${r.ignored} ${r.durationMs}ms${err}`,
    );
  }
  if (results.length && results.every((r) => !r.ok)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
