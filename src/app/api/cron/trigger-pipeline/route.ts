import { NextRequest, NextResponse } from 'next/server';

/**
 * Dispara o workflow "Pipeline editorial" no GitHub Actions via workflow_dispatch.
 *
 * Existe porque o `schedule` (cron) nativo do GitHub Actions se mostrou pouco confiável
 * neste repositório: menos de 15% dos disparos agendados chegaram a rodar em 6 dias de
 * observação (ver histórico de runs em Actions). O GitHub documenta o `schedule` como
 * "best effort", sem SLA — não é bug, é a limitação conhecida do recurso.
 *
 * Em vez de depender do agendador do GitHub, um serviço de cron EXTERNO (ex.: cron-job.org)
 * chama esta rota a cada N minutos; ela então aciona o workflow via API do GitHub. A chave
 * do GitHub (GH_TRIGGER_TOKEN) fica só aqui no servidor — nunca é exposta ao serviço de cron,
 * que só recebe o CRON_SECRET desta rota.
 */
const OWNER = 'eucledirnunes';
const REPO = 'portaldainteligencia';
const WORKFLOW_FILE = 'pipeline.yml';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET não configurado no servidor.' }, { status: 500 });
  if (req.nextUrl.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }

  const token = process.env.GH_TRIGGER_TOKEN;
  if (!token) return NextResponse.json({ error: 'GH_TRIGGER_TOKEN não configurado no servidor.' }, { status: 500 });

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });

  if (res.status !== 204) {
    const body = await res.text();
    console.error(`trigger-pipeline: GitHub respondeu ${res.status}: ${body}`);
    return NextResponse.json({ error: `GitHub respondeu ${res.status}`, body }, { status: 502 });
  }

  return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
}
