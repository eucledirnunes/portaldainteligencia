import { SITE } from './site';

const dateFmt = new Intl.DateTimeFormat(SITE.locale, { day: '2-digit', month: 'long', year: 'numeric', timeZone: SITE.timezone });
const dateTimeFmt = new Intl.DateTimeFormat(SITE.locale, {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: SITE.timezone,
});
const timeFmt = new Intl.DateTimeFormat(SITE.locale, { hour: '2-digit', minute: '2-digit', timeZone: SITE.timezone });
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: SITE.timezone });

export const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '');
export const formatDateTime = (iso: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '');
export const formatTime = (iso: string | null) => (iso ? timeFmt.format(new Date(iso)) : '');

/** "há 5 min", "há 3 h", ou data curta se passou de 24 h. */
export function timeAgo(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const diff = now.getTime() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return formatDateTime(iso);
}

export const isSameDay = (a: string, b: Date = new Date()) => dayKey.format(new Date(a)) === dayKey.format(b);

export const formatClock = (iso: string | null) => (iso ? `${timeFmt.format(new Date(iso))} BRT` : '');
