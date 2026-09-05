// Preset boundaries are computed in the browser's local timezone. The server
// runs TZ=America/Argentina/Buenos_Aires, so this matches when the user's
// device is in that zone. If a user opens the app from a different zone,
// presets will be off by the offset; server-side aggregation still uses the
// pinned TZ, so historical data is unaffected.
export type Preset = 'today' | 'week' | 'month' | 'all';

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all', label: 'Todo' },
];

export function getPresetDates(preset: Preset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === 'today') {
    const today = toDateStr(now);
    return { dateFrom: today, dateTo: today };
  }
  if (preset === 'week') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const from = new Date(now);
    from.setDate(now.getDate() - diffToMonday);
    return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
  }
  if (preset === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
  }
  return {};
}
