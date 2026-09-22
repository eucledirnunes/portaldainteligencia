import { createServiceClient } from '@/lib/supabase/clients';
import { createEditorialServices } from './index';
import { generateArticles } from './run';

async function main() {
  const svc = createEditorialServices();
  const redo = process.argv.includes('--redo');
  const improve = redo || process.argv.includes('--improve');
  console.log(`editorial: provider=${svc.provider.name}${improve ? ` (modo ${redo ? '--redo' : '--improve'})` : ''}`);
  if (svc.provider.name === 'none') {
    console.log('editorial: sem provedor de IA. Artigos em outro idioma ficam em RASCUNHO e nada em inglês é publicado.');
  }
  const s = await generateArticles(createServiceClient(), svc, { improve, redo });
  console.log(`editorial: gerados=${s.generated} publicados=${s.published} retidos_fora_de_pt=${s.heldNotPt} falhas=${s.failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
