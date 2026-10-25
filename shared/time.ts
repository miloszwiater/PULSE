/**
 * Calendar time in PULSE is "floating local": events are stored as a date
 * (YYYY-MM-DD) plus minutes from midnight. Absolute instants (sessions,
 * check-ins) are epoch ms and are converted using the profile timezone.
 */

export type DateStr = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dateStr(y: number, m: number, d: number): DateStr {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDate(s: DateStr): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** UTC-based day arithmetic so DST never shifts a calendar date. */
export function addDays(s: DateStr, n: number): DateStr {
  const { y, m, d } = parseDate(s);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return dateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function daysBetween(a: DateStr, b: DateStr): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

/** 0 = Monday … 6 = Sunday */
export function weekday(s: DateStr): number {
  const { y, m, d } = parseDate(s);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function weekStart(s: DateStr): DateStr {
  return addDays(s, -weekday(s));
}

export function weekDates(s: DateStr): DateStr[] {
  const start = weekStart(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthStart(s: DateStr): DateStr {
  const { y, m } = parseDate(s);
  return dateStr(y, m, 1);
}

export function daysInMonth(s: DateStr): number {
  const { y, m } = parseDate(s);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(s: DateStr, n: number): DateStr {
  const { y, m } = parseDate(s);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return dateStr(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
}

interface ZonedParts { date: DateStr; minutes: number }

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      });
    } catch {
      f = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      });
    }
    fmtCache.set(tz, f);
  }
  return f;
}

/** Calendar date + minute-of-day of an instant in the given timezone. */
export function zoned(ms: number, tz: string): ZonedParts {
  const parts = formatter(tz).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export function hhmm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

/** "2 h 05 min", "45 min" */
export function durationLabel(totalMinutes: number): string {
  const t = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(t / 60);
  const m = t % 60;
  // Non-breaking spaces keep "3 h" together in headlines.
  if (h === 0) return `${m}\u00a0min`;
  if (m === 0) return `${h}\u00a0h`;
  return `${h}\u00a0h ${pad(m)}\u00a0min`;
}

export interface Interval { start: number; end: number }

/** Merge overlapping intervals (minutes). */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Free windows inside [from, to] not covered by busy intervals. */
export function freeWindows(busy: Interval[], from: number, to: number): Interval[] {
  const merged = mergeIntervals(busy);
  const out: Interval[] = [];
  let cursor = from;
  for (const b of merged) {
    if (b.end <= cursor) continue;
    if (b.start >= to) break;
    if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, to) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) out.push({ start: cursor, end: to });
  return out.filter((w) => w.end > w.start);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

const WD_PL = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];
const MON_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
/** Compact Polish date for generated labels: "pn 26 paź". */
export function plDate(s: DateStr): string {
  const { m, d } = parseDate(s);
  return `${WD_PL[weekday(s)]} ${d} ${MON_PL[m - 1]}`;
}
