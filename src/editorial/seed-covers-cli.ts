import { createServiceClient } from '@/lib/supabase/clients';
import { seedCategoryCovers } from './covers-pool';
import { createImageProvider } from './images';

async function main() {
  const provider = createImageProvider();
  if (!provider) {
    console.error('Nenhum provedor de imagem configurado (defina OPENAI_API_KEY ou CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN).');
    process.exit(1);
  }
  const force = process.argv.includes('--force');
  console.log(`Gerando pool de capas por categoria via ${provider.name}${force ? ' (--force: regera tudo)' : ' (pula o que já existe)'}...`);
  const stats = await seedCategoryCovers(createServiceClient(), provider, { force });
  console.log(`Concluído: criadas=${stats.created} puladas=${stats.skipped} falhas=${stats.failed}`);
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
