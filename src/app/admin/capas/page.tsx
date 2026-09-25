import { listCoverSlots } from '@/editorial/covers-pool';
import { createImageProvider } from '@/editorial/images';
import { createServiceClient } from '@/lib/supabase/clients';
import { regenerateCover, uploadCover } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Capas', robots: { index: false, follow: false } };

export default async function AdminCapas() {
  const db = createServiceClient();
  const [categories, provider] = await Promise.all([listCoverSlots(db), Promise.resolve(createImageProvider())]);

  return (
    <>
      <div className="mb-6">
        <h1 className="headline text-2xl">Capas por categoria</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Cada categoria tem 4 imagens fixas, reaproveitadas entre as matérias (nenhuma é gerada por matéria).
          Trocar uma imagem aqui muda o que aparece em todas as matérias daquela categoria que usam essa posição, em até 1 minuto.
        </p>
        {!provider && (
          <p className="mt-3 rounded-lg bg-alert/10 p-3 text-sm text-alert">
            Nenhum provedor de imagem configurado (OPENAI_API_KEY ou CLOUDFLARE_*) — o botão &quot;Gerar nova (IA)&quot; não vai funcionar. Enviar arquivo manualmente continua disponível.
          </p>
        )}
      </div>

      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.slug}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{cat.name}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {cat.slots.map((slot) => (
                <div key={slot.index} className="panel overflow-hidden">
                  <div className="aspect-video bg-low">
                    {slot.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={slot.url} alt={`${cat.name} #${slot.index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">Vazio</div>
                    )}
                  </div>
                  <div className="space-y-2 p-2.5">
                    <p className="meta">Posição {slot.index + 1}/4</p>
                    <form action={regenerateCover}>
                      <input type="hidden" name="slug" value={cat.slug} />
                      <input type="hidden" name="name" value={cat.name} />
                      <input type="hidden" name="index" value={slot.index} />
                      <button className="w-full rounded bg-ink px-2 py-1.5 text-xs font-semibold text-bg hover:bg-ink/90" disabled={!provider}>
                        Gerar nova (IA)
                      </button>
                    </form>
                    <form action={uploadCover} className="flex gap-1.5">
                      <input type="hidden" name="slug" value={cat.slug} />
                      <input type="hidden" name="index" value={slot.index} />
                      <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required className="w-full min-w-0 text-[0.7rem] file:mr-1 file:rounded file:border-0 file:bg-container file:px-1.5 file:py-1 file:text-[0.65rem]" />
                      <button className="shrink-0 rounded border border-line px-2 py-1.5 text-xs font-semibold hover:bg-low">Enviar</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
