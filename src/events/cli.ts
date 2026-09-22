import { createEditorialServices } from '@/editorial';
import { createServiceClient } from '@/lib/supabase/clients';
import { clusterNewArticles } from './cluster';
import { TitleEntityMatcher } from './matcher';

async function main() {
  const { classifier } = createEditorialServices();
  const stats = await clusterNewArticles(createServiceClient(), new TitleEntityMatcher(), classifier);
  console.log(`eventos: processados=${stats.processed} anexados=${stats.attached} criados=${stats.created} falhas=${stats.failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
