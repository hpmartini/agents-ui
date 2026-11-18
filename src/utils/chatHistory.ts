export const RECENCY = ['Today', 'Yesterday', 'This week', 'Older'] as const;
export type Recency = (typeof RECENCY)[number];

const startOfDay = (now: number) => new Date(now).setHours(0, 0, 0, 0);

/** Rail section of a last activity, in local days; "This week" = the 7 days before yesterday */
export function recencyOf(time: number | null, now = Date.now()): Recency {
  if (time == null) return 'Older';
  const today = startOfDay(now);
  if (time >= today) return 'Today';
  const yesterday = new Date(today).setDate(new Date(today).getDate() - 1);
  if (time >= yesterday) return 'Yesterday';
  return time >= new Date(today).setDate(new Date(today).getDate() - 7) ? 'This week' : 'Older';
}

/** Short age for a rail row: "now", "5m", "3h", a weekday this week, else the date */
export function relativeTime(time: number | null, now = Date.now(), justNow = 'now'): string {
  if (time == null) return '';
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return justNow;
  if (minutes < 60) return `${minutes}m`;
  if (time >= startOfDay(now)) return `${Math.floor(minutes / 60)}h`;
  const date = new Date(time);
  if (recencyOf(time, now) !== 'Older')
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === new Date(now).getFullYear() ? {} : { year: 'numeric' }),
  });
}
