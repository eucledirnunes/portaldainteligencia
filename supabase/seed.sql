-- Seed: categorias, empresas, modelos e fontes iniciais. Idempotente.

insert into categories (name, slug, description, sort_order, show_in_nav) values
 ('Modelos',        'modelos-de-ia',  'Lançamentos e atualizações de modelos de IA',        10, true),
 ('Open Source',    'open-source',    'Modelos e ferramentas abertos',                       20, false),
 ('Agentes',        'agentes',        'Agentes autônomos e automação com IA',                30, false),
 ('Imagem',         'imagem',         'Geração e edição de imagens',                         40, false),
 ('Vídeo',          'video',          'Geração e edição de vídeo',                           50, false),
 ('Áudio',          'audio',          'Voz, música e áudio com IA',                          60, false),
 ('Robótica',       'robotica',       'Robôs, embodied AI e veículos autônomos',             70, false),
 ('Pesquisa',       'pesquisa',       'Papers, benchmarks e avanços científicos',            80, true),
 ('Negócios',       'negocios',       'Mercado, parcerias e estratégia',                     90, false),
 ('Startups',       'startups',       'Novas empresas e rodadas',                           100, false),
 ('Investimentos',  'investimentos',  'Aportes, valuation e infraestrutura',                110, false),
 ('Ferramentas',    'ferramentas',    'Produtos e ferramentas de IA',                       120, true),
 ('Legislação',     'legislacao',     'Regulação, políticas e direitos',                    130, false),
 ('IA no Brasil',   'ia-no-brasil',   'O que acontece com IA no Brasil',                    140, true)
on conflict (slug) do nothing;

insert into companies (name, slug, website_url, description) values
 ('OpenAI',       'openai',       'https://openai.com',            'Criadora do ChatGPT e da família de modelos GPT.'),
 ('Anthropic',    'anthropic',    'https://www.anthropic.com',     'Criadora do Claude, com foco em segurança de IA.'),
 ('Google',       'google',       'https://ai.google',             'Google e Google DeepMind: Gemini, Gemma e pesquisa em IA.'),
 ('Meta',         'meta',         'https://ai.meta.com',           'Criadora da família de modelos abertos Llama.'),
 ('Microsoft',    'microsoft',    'https://www.microsoft.com/ai',  'Copilot, Azure AI e parceria com a OpenAI.'),
 ('NVIDIA',       'nvidia',       'https://www.nvidia.com',        'GPUs e plataforma de computação para IA.'),
 ('Perplexity',   'perplexity',   'https://www.perplexity.ai',     'Motor de busca conversacional com IA.'),
 ('Mistral',      'mistral',      'https://mistral.ai',            'Laboratório francês de modelos abertos e comerciais.'),
 ('xAI',          'xai',          'https://x.ai',                  'Criadora do Grok.'),
 ('Hugging Face', 'hugging-face', 'https://huggingface.co',        'Plataforma aberta de modelos, datasets e ferramentas de ML.'),
 ('Runway',       'runway',       'https://runwayml.com',          'Geração de vídeo com IA.'),
 ('ElevenLabs',   'elevenlabs',   'https://elevenlabs.io',         'Síntese e clonagem de voz com IA.'),
 ('Stability AI', 'stability-ai', 'https://stability.ai',          'Criadora do Stable Diffusion.'),
 ('Amazon',       'amazon',       'https://aws.amazon.com/ai',     'AWS, Bedrock e modelos Nova.'),
 ('DeepSeek',     'deepseek',     'https://www.deepseek.com',      'Laboratório chinês de modelos abertos.')
on conflict (slug) do nothing;

insert into models (company_id, name, slug, description, metadata)
select c.id, m.name, m.slug, m.descr, m.meta::jsonb
from (values
 ('openai',    'GPT',      'gpt',      'Família de modelos de linguagem da OpenAI.',  '{"kind":"family"}'),
 ('openai',    'ChatGPT',  'chatgpt',  'Assistente conversacional da OpenAI.',        '{"kind":"product"}'),
 ('anthropic', 'Claude',   'claude',   'Família de modelos e assistente da Anthropic.','{"kind":"family"}'),
 ('google',    'Gemini',   'gemini',   'Família de modelos multimodais do Google.',   '{"kind":"family"}'),
 ('xai',       'Grok',     'grok',     'Modelos e assistente da xAI.',                '{"kind":"family"}'),
 ('meta',      'Llama',    'llama',    'Família de modelos abertos da Meta.',         '{"kind":"family"}'),
 ('deepseek',  'DeepSeek', 'deepseek', 'Modelos abertos da DeepSeek.',                '{"kind":"family"}')
) as m(company, name, slug, descr, meta)
join companies c on c.slug = m.company
on conflict (slug) do nothing;

-- Fontes. RSS verificado em 2026-09 para as ativas. As demais não têm RSS público estável:
-- ficam como scraper INATIVO até configurar/validar seletores (ver docs/SOURCES.md).
insert into sources (name, slug, website_url, feed_url, source_type, is_primary_source, reliability_level, language, country, company_id, active, config) values
 -- Fontes primárias com RSS
 ('OpenAI',        'openai',        'https://openai.com/news',                  'https://openai.com/news/rss.xml',                          'rss', true, 5, 'en', 'US', (select id from companies where slug='openai'),       true, '{}'),
 ('Google AI',     'google-ai',     'https://blog.google/technology/ai/',       'https://blog.google/technology/ai/rss/',                   'rss', true, 5, 'en', 'US', (select id from companies where slug='google'),       true, '{}'),
 ('Google DeepMind','google-deepmind','https://deepmind.google/discover/blog/', 'https://deepmind.google/blog/rss.xml',                     'rss', true, 5, 'en', 'GB', (select id from companies where slug='google'),       true, '{}'),
 ('Google Research','google-research','https://research.google/blog/',         'https://research.google/blog/rss/',                        'rss', true, 5, 'en', 'US', (select id from companies where slug='google'),       true, '{}'),
 ('NVIDIA Blog',   'nvidia-blog',   'https://blogs.nvidia.com/',                'https://blogs.nvidia.com/blog/category/generative-ai/feed/','rss', true, 4, 'en', 'US', (select id from companies where slug='nvidia'),       true, '{}'),
 ('Hugging Face',  'hugging-face',  'https://huggingface.co/blog',              'https://huggingface.co/blog/feed.xml',                     'rss', true, 4, 'en', 'US', (select id from companies where slug='hugging-face'), true, '{}'),
 ('Mistral AI',    'mistral',       'https://mistral.ai/news',                  'https://mistral.ai/rss.xml',                               'rss', true, 4, 'en', 'FR', (select id from companies where slug='mistral'),      true, '{}'),
 ('AWS Machine Learning','aws-ml',  'https://aws.amazon.com/blogs/machine-learning/','https://aws.amazon.com/blogs/machine-learning/feed/','rss', true, 4, 'en', 'US', (select id from companies where slug='amazon'),       true, '{}'),
 -- Fontes primárias sem RSS (scraper — inativas até validação)
 ('Anthropic',     'anthropic',     'https://www.anthropic.com/news',           null, 'scraper', true, 5, 'en', 'US', (select id from companies where slug='anthropic'),  false, '{"note":"Sem RSS oficial (404). Requer scraper."}'),
 ('Meta AI',       'meta-ai',       'https://ai.meta.com/blog/',                null, 'scraper', true, 5, 'en', 'US', (select id from companies where slug='meta'),       false, '{"note":"Sem RSS oficial (404). Requer scraper."}'),
 ('Microsoft AI',  'microsoft-ai',  'https://blogs.microsoft.com/ai/',          null, 'scraper', true, 4, 'en', 'US', (select id from companies where slug='microsoft'),  false, '{"note":"Feed antigo retorna 410. Requer scraper."}'),
 ('Perplexity',    'perplexity',    'https://www.perplexity.ai/hub',            null, 'scraper', true, 4, 'en', 'US', (select id from companies where slug='perplexity'), false, '{"note":"Feed retorna 403; não contornar. Avaliar scraper respeitando robots.txt."}'),
 ('xAI',           'xai',           'https://x.ai/news',                        null, 'scraper', true, 4, 'en', 'US', (select id from companies where slug='xai'),        false, '{"note":"Sem RSS (404)."}'),
 ('Runway',        'runway',        'https://runwayml.com/news',                null, 'scraper', true, 4, 'en', 'US', (select id from companies where slug='runway'),     false, '{"note":"Sem RSS (404)."}'),
 ('ElevenLabs',    'elevenlabs',    'https://elevenlabs.io/blog',               null, 'scraper', true, 4, 'en', 'US', (select id from companies where slug='elevenlabs'), false, '{"note":"Sem RSS (404)."}'),
 ('Stability AI',  'stability-ai',  'https://stability.ai/news',                null, 'scraper', true, 4, 'en', 'GB', (select id from companies where slug='stability-ai'),false, '{"note":"Sem RSS válido."}'),
 -- Jornalísticas (feeds já focados em IA)
 ('TechCrunch AI', 'techcrunch-ai', 'https://techcrunch.com/category/artificial-intelligence/','https://techcrunch.com/category/artificial-intelligence/feed/','rss', false, 4, 'en', 'US', null, true, '{}'),
 ('The Verge AI',  'the-verge-ai',  'https://www.theverge.com/ai-artificial-intelligence','https://www.theverge.com/rss/ai-artificial-intelligence/index.xml','rss', false, 4, 'en', 'US', null, true, '{}'),
 ('Wired AI',      'wired-ai',      'https://www.wired.com/tag/artificial-intelligence/','https://www.wired.com/feed/tag/ai/latest/rss',       'rss', false, 4, 'en', 'US', null, true, '{}'),
 ('Ars Technica AI','ars-technica-ai','https://arstechnica.com/ai/',            'https://arstechnica.com/ai/feed/',                         'rss', false, 4, 'en', 'US', null, true, '{}'),
 ('MIT Technology Review','mit-technology-review','https://www.technologyreview.com/topic/artificial-intelligence/','https://www.technologyreview.com/topic/artificial-intelligence/feed','rss', false, 5, 'en', 'US', null, true, '{}'),
 ('VentureBeat AI','venturebeat-ai','https://venturebeat.com/category/ai/',     'https://venturebeat.com/category/ai/feed/',                'rss', false, 3, 'en', 'US', null, false, '{"note":"Retornou 429 em teste; reativar após validar limite de requisições."}'),
 -- Brasil (feeds generalistas de tecnologia: filtro de IA obrigatório)
 ('Tecnoblog',     'tecnoblog',     'https://tecnoblog.net',                    'https://tecnoblog.net/feed/',                              'rss', false, 3, 'pt', 'BR', null, true, '{"ai_filter":true}'),
 ('Canaltech',     'canaltech',     'https://canaltech.com.br',                 'https://canaltech.com.br/rss/',                            'rss', false, 3, 'pt', 'BR', null, true, '{"ai_filter":true}'),
 ('Olhar Digital', 'olhar-digital', 'https://olhardigital.com.br',              'https://olhardigital.com.br/feed/',                        'rss', false, 3, 'pt', 'BR', null, true, '{"ai_filter":true}')
on conflict (slug) do nothing;
