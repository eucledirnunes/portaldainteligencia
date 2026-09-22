import { fetchWithRetry, USER_AGENT } from '@/lib/utils/http';

const escapeRe = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Parser mínimo de robots.txt: regras Allow/Disallow do grupo do nosso UA ou de "*". */
export function isAllowedByRobots(robotsTxt: string, path: string, userAgent = USER_AGENT): boolean {
  const ua = userAgent.split(/[\s/]/)[0].toLowerCase();
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      lastWasAgent = false;
      if (value) current.rules.push({ allow: key === 'allow', path: value });
    } else {
      lastWasAgent = false;
    }
  }

  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  let best: { allow: boolean; len: number } | null = null;
  for (const g of applicable) {
    for (const r of g.rules) {
      const anchored = r.path.endsWith('$');
      const body = escapeRe(anchored ? r.path.slice(0, -1) : r.path).replace(/\\\*/g, '.*');
      if (new RegExp('^' + body + (anchored ? '$' : '')).test(path)) {
        if (!best || r.path.length > best.len || (r.path.length === best.len && r.allow)) {
          best = { allow: r.allow, len: r.path.length };
        }
      }
    }
  }
  return best ? best.allow : true;
}

export async function canFetch(url: string): Promise<boolean> {
  const u = new URL(url);
  try {
    const res = await fetchWithRetry(`${u.origin}/robots.txt`, { retries: 1, timeoutMs: 10_000 });
    if (!res.ok) return true; // sem robots.txt = sem restrições declaradas
    return isAllowedByRobots(await res.text(), u.pathname + u.search);
  } catch {
    return false; // na dúvida, não coletar
  }
}
