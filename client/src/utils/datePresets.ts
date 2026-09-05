// Preset boundaries are computed in Argentina time (America/Argentina/Buenos_Aires)
// regardless of the user's device timezone. The server also runs in Argentina TZ
// (pinned in api/index.ts and server/src/main.ts), so client and server agree on
// what "today" / "this week" / "this month" mean.
export type Preset = 'today' | 'week' | 'month' | 'all';

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'all', label: 'Todo' },
];

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires';

const ARGENTINA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const ARGENTINA_YEAR_MONTH_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TZ,
  year: 'numeric',
  month: '2-digit',
});

const ARGENTINA_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ARGENTINA_TZ,
  weekday: 'short',
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// Format a Date as YYYY-MM-DD in Argentina time.
function argentinaDateStr(d: Date): string {
  return ARGENTINA_DATE_FORMATTER.format(d);
}

// Day of week (0 = Sunday ... 6 = Saturday) for `d` interpreted in Argentina time.
function argentinaDayOfWeek(d: Date): number {
  return WEEKDAY_INDEX[ARGENTINA_WEEKDAY_FORMATTER.format(d)] ?? 0;
}

// Subtract N calendar days from a YYYY-MM-DD string. We only emit strings so the
// arithmetic's intermediate timezone doesn't matter — Date constructor + setDate
// just bumps the day, no conversion.
function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getPresetDates(preset: Preset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = argentinaDateStr(now);

  if (preset === 'today') {
    return { dateFrom: today, dateTo: today };
  }
  if (preset === 'week') {
    const dow = argentinaDayOfWeek(now);
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const from = subtractDays(today, diffToMonday);
    return { dateFrom: from, dateTo: today };
  }
  if (preset === 'month') {
    const yearMonth = ARGENTINA_YEAR_MONTH_FORMATTER.format(now); // YYYY-MM
    return { dateFrom: `${yearMonth}-01`, dateTo: today };
  }
  return {};
}