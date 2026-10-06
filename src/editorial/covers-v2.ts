import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { createImageProvider } from './images';

/**
 * Capas v2: cenas fotorrealistas por categoria (4 variações), no lugar das ilustrações abstratas.
 * Gera em uma pasta local (staging) para revisão; "apply" envia ao pool do storage depois da aprovação.
 * Uso: tsx src/editorial/covers-v2.ts gen <pasta>   |   tsx src/editorial/covers-v2.ts apply <pasta>
 */
const STYLE = 'Photorealistic editorial news photograph, cinematic lighting, shallow depth of field, rich deep blue and teal color grading, high detail, professional magazine quality. No text, no logos, no watermarks, no readable letters, no recognizable faces.';

export const SCENES: Record<string, string[]> = {
  'modelos-de-ia': ['rows of glowing GPU servers in a dark data center aisle', 'close-up of a glowing computer chip circuit board with blue light', 'engineer silhouette in front of large screens showing abstract neural network visualizations', 'futuristic server hall with blue light streaks and cooling pipes'],
  'open-source': ['hands typing code on a laptop in a dim workspace with colorful syntax on screen', 'developers collaborating around a table with laptops in a bright modern loft', 'macro of a mechanical keyboard with soft blue backlight', 'laptop with code on screen beside a coffee cup at night'],
  agentes: ['a sleek humanoid robot assistant at a modern office desk', 'a small friendly robot helping a person at a laptop, bright office', 'holographic interface floating above a desk in a dark room, blue glow', 'robot hand and human hand reaching toward each other over a keyboard'],
  imagem: ['a digital artist drawing on a graphics tablet with colorful artwork on a monitor', 'a camera lens with colorful light reflections close-up', 'a creative studio with large monitors showing vivid generated artwork', 'abstract colorful light painting in a dark studio'],
  video: ['a professional video editing suite with timelines on large monitors', 'a cinema camera on a tripod in a studio with soft lights', 'film clapperboard and studio lights, cinematic dark background', 'video production control room with many screens'],
  audio: ['studio microphone with warm light in a recording booth', 'headphones on a mixing console in a dim studio', 'abstract sound waveform glowing on a dark screen', 'musician producer at a mixing desk with soft blue light'],
  robotica: ['an industrial robot arm assembling parts in a clean modern factory', 'a humanoid robot walking in a bright laboratory', 'autonomous delivery robot on a city street at dusk', 'robotic arms on an automated production line, blue lighting'],
  pesquisa: ['scientist in a white lab coat looking at holographic data in a modern laboratory', 'a university library with warm light and rows of books', 'close-up of a microscope in a bright lab', 'a researcher whiteboard full of equations in a modern office'],
  negocios: ['modern glass skyscrapers seen from below at golden hour', 'business people shaking hands in a bright boardroom, seen from behind', 'a boardroom with a city view and an empty long table', 'financial district skyline at dusk with light trails'],
  startups: ['a small team brainstorming around a table with sticky notes in a bright startup office', 'three young entrepreneurs standing and looking at a large wall screen in a modern office, seen from behind', 'a whiteboard with product sketches and sticky notes, creative office', 'two founders celebrating with a high five in a bright startup office, seen from the side'],
  investimentos: ['a stock market trading screen with green and red charts glowing', 'stacks of coins with a rising arrow chart in the background, soft light', 'trading floor monitors showing candlestick charts at night', 'aerial view of a glass financial district at blue hour, windows without signage'],
  ferramentas: ['a modern desk with laptop, tablet and phone showing app interfaces, top view', 'a sleek workspace with a laptop and a smartphone on a wooden desk, bright', 'hands holding a smartphone with a glowing abstract app interface', 'a tidy digital workspace with multiple screens and plants'],
  legislacao: ['a courtroom with a wooden gavel and scales of justice in warm light', 'a modern parliament building facade at dusk', 'law books and a gavel on a polished desk, dramatic light', 'columns of a classical government building with blue sky'],
  'ia-no-brasil': ['aerial view of the São Paulo skyline at sunset', 'Rio de Janeiro bay and mountains at golden hour, aerial view', 'Brasília modernist architecture at dusk with deep blue sky', 'busy Avenida Paulista at night with light trails'],
  geral: ['abstract glowing neural network of light points on a dark blue background, depth of field', 'a modern futuristic city skyline with digital light overlays at night', 'glowing blue circuit lines forming a world map on dark background', 'a person silhouette looking at a large wall of data visualizations'],
};

async function main() {
  const [mode, dir] = process.argv.slice(2);
  if (!dir) throw new Error('informe a pasta');
  if (mode === 'gen') {
    const provider = createImageProvider();
    if (!provider) throw new Error('sem provedor de imagem');
    for (const [slug, scenes] of Object.entries(SCENES)) {
      for (let i = 0; i < scenes.length; i++) {
        const file = join(dir, slug, `${i}.png`);
        if (existsSync(file)) continue;
        try {
          const bytes = await provider.generate(`${scenes[i]}. ${STYLE}`);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, bytes);
          console.log('ok', slug, i);
        } catch (e) {
          console.log('PARADO', slug, i, String(e instanceof Error ? e.message : e).slice(0, 200));
          return;
        }
      }
    }
    console.log('TUDO GERADO');
  }
  if (mode === 'apply') {
    const { createServiceClient } = await import('@/lib/supabase/clients');
    const { readFileSync } = await import('fs');
    const db = createServiceClient();
    let n = 0;
    for (const [slug, scenes] of Object.entries(SCENES)) {
      for (let i = 0; i < scenes.length; i++) {
        const bytes = readFileSync(join(dir, slug, `${i}.png`));
        const up = await db.storage.from('article-covers').upload(`categories/${slug}/${i}.png`, bytes, { contentType: 'image/png', upsert: true, cacheControl: '300' });
        if (up.error) throw up.error;
        n++;
      }
    }
    console.log('aplicadas', n);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
