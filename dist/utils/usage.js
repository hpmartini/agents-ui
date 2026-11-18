/** "in 2 h 53 min", "in 4 T 6 h", "in 12 min", "jetzt" */
export function formatResetIn(resetsAt, now = Date.now()) {
    if (resetsAt == null)
        return 'erfolgt';
    const min = Math.floor((resetsAt - now) / 60_000);
    if (min <= 0)
        return 'jetzt';
    const d = Math.floor(min / 1440);
    const h = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d > 0)
        return `in ${d} T ${h} h`;
    if (h > 0)
        return `in ${h} h ${m} min`;
    return `in ${m} min`;
}
export function limitStatus(window) {
    if (!window || window.usedPercent == null)
        return 'unknown';
    if (window.usedPercent >= 90)
        return 'critical';
    if (window.usedPercent >= 70)
        return 'warn';
    return 'ok';
}
/** Week bar sections Mo, Di, Mi, Do, Fr, weekend (Sa+So count as one), as % borders */
export const WEEK_TICKS = [1, 2, 3, 4, 5].map((i) => (i / 6) * 100);
/** Where `now` sits on that week bar in % (Mon 00:00 = 0, Sun 24:00 = 100), local time */
export function weekPace(now = Date.now()) {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const ofDay = (d.getHours() * 60 + d.getMinutes()) / 1440;
    const section = day < 5 ? day + ofDay : 5 + (day - 5 + ofDay) / 2;
    return (section / 6) * 100;
}
