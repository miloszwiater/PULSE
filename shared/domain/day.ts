import type { DayStatus, EventKind, PEvent } from '../schema';
import { BLOCKING_KINDS, COMMITMENT_KINDS } from '../schema';
import { addDays, freeWindows, mergeIntervals, weekday, zoned, type Interval } from '../time';
import { alive, type Clock, type Snapshot } from './snapshot';

export type EffectiveStatus = DayStatus | 'low';

export interface Block extends Interval {
  kind: EventKind;
  title: string;
  routine_id?: string;
  event_id?: string;
}

export type CapacityMode = 'none' | 'light' | 'normal' | 'long';

export interface DayContext {
  date: string;
  status: EffectiveStatus;
  statusSource: 'day' | 'care' | 'none';
  blocks: Block[];
  workMinutes: number;
  privateMinutes: number;
  commitments: PEvent[];
  committedMinutes: number;
  /** Creative time already logged this day (finished sessions). */
  doneMinutes: number;
  mode: CapacityMode;
  /** Maximum minutes of development work that is reasonable this day. */
  maxMinutes: number;
  remainingMinutes: number;
  windows: Interval[];
  reason: string;
}

/** Thresholds are product rules — tested in tests/planner.test.ts. */
export const RULES = {
  heavyWorkMinutes: 600, // ≥10 h of work+commute: light at most
  longWorkMinutes: 420, // ≥7 h: shorter sessions
  recoveryAfterWork: 60, // no development work right after a shift
  bufferAroundBlocks: 15,
  morningLead: 45, // after wake
  eveningLead: 45, // before bed
  minSessionMinutes: 30,
  lightMax: 30,
};

const LIVE_STATUSES = new Set(['planned', 'done', 'partial', 'covered']);

export function effectiveStatus(snap: Snapshot, date: string): { status: EffectiveStatus; source: 'day' | 'care' | 'none'; note: string } {
  const ds = alive(snap.day_states).find((d) => d.date === date);
  if (ds && ds.status !== 'normal') return { status: ds.status, source: 'day', note: ds.note };
  // Latest relevant care signal wins: a multi-day sick report or a same-day signal.
  const relevant = alive(snap.care).filter((c) =>
    (c.signal === 'sick' && c.date <= date && (c.until ?? c.date) >= date) || c.date === date,
  );
  relevant.sort((a, b) => b.at - a.at);
  const top = relevant[0];
  if (!top || top.signal === 'energized') return { status: 'normal', source: 'none', note: '' };
  if (top.signal === 'sick') return { status: 'sick', source: 'care', note: top.note };
  if (top.signal === 'overloaded') return { status: 'overloaded', source: 'care', note: top.note };
  return { status: 'low', source: 'care', note: top.note };
}

/** Routine blocks + blocking events for a date, including overnight spill from the previous day. */
export function blocksFor(snap: Snapshot, date: string): Block[] {
  const out: Block[] = [];
  const add = (d: string, shift: number) => {
    const wd = weekday(d);
    for (const r of alive(snap.routines)) {
      if (!r.active || !r.weekdays.includes(wd)) continue;
      if (r.valid_from && d < r.valid_from) continue;
      if (r.valid_to && d > r.valid_to) continue;
      if (alive(snap.routine_exceptions).some((x) => x.routine_id === r.id && x.date === d)) continue;
      out.push({ kind: r.kind, title: r.title, start: r.start_min - shift, end: r.end_min - shift, routine_id: r.id });
    }
    for (const e of alive(snap.events)) {
      if (e.date !== d || !BLOCKING_KINDS.includes(e.kind)) continue;
      if (!LIVE_STATUSES.has(e.status)) continue;
      out.push({ kind: e.kind, title: e.title, start: e.start_min - shift, end: e.end_min - shift, event_id: e.id });
    }
  };
  add(date, 0);
  add(addDays(date, -1), 1440);
  return out
    .map((b) => ({ ...b, start: Math.max(0, b.start), end: Math.min(b.end, 2160) }))
    .filter((b) => b.end > 0 && b.start < 1440 + 720 && b.end > b.start);
}

function minutesOf(blocks: Block[], kinds: EventKind[]): number {
  return mergeIntervals(blocks.filter((b) => kinds.includes(b.kind)).map((b) => ({ start: Math.max(0, b.start), end: Math.min(1440, b.end) })))
    .reduce((s, i) => s + (i.end - i.start), 0);
}

export function commitmentsFor(snap: Snapshot, date: string): PEvent[] {
  return alive(snap.events).filter((e) => e.date === date && COMMITMENT_KINDS.includes(e.kind) && e.status === 'planned');
}

/**
 * Capacity model: how much development work a day can reasonably hold.
 * The planner never fills every free minute — it caps by workload and
 * status, keeps recovery after work and buffers around obligations.
 */
export function dayContext(snap: Snapshot, date: string, clock?: Clock, opts: { ignoreEventId?: string } = {}): DayContext {
  const p = snap.profile;
  const wake = p?.wake_min ?? 450;
  const bed = p?.bed_min ?? 1410;
  const bedAbs = bed <= wake ? bed + 1440 : bed;
  const { status, source } = effectiveStatus(snap, date);
  const blocks = blocksFor(snap, date);
  const workMinutes = minutesOf(blocks, ['work', 'commute']);
  const privateMinutes = minutesOf(blocks, ['private', 'relationship']);
  const commitments = commitmentsFor(snap, date).filter((e) => e.id !== opts.ignoreEventId);
  const committedMinutes = commitments.reduce((s, e) => s + (e.end_min - e.start_min), 0);
  const tz = p?.timezone ?? 'Europe/Warsaw';
  const doneMinutes = Math.round(alive(snap.sessions)
    .filter((x) => x.status === 'finished' && zoned(x.started_at, tz).date === date)
    .reduce((t, x) => t + x.active_seconds, 0) / 60);

  const busy: Interval[] = blocks.map((b) => {
    const after = b.kind === 'work' || b.kind === 'commute' ? RULES.recoveryAfterWork : RULES.bufferAroundBlocks;
    return { start: b.start - RULES.bufferAroundBlocks, end: b.end + after };
  });
  for (const c of commitments) busy.push({ start: c.start_min - 10, end: c.end_min + 10 });
  let from = wake + RULES.morningLead;
  if (clock && clock.today === date) from = Math.max(from, Math.ceil((clock.nowMin + 10) / 15) * 15);
  const to = Math.min(bedAbs - RULES.eveningLead, 1440 + 60);
  const windows = from < to ? freeWindows(busy, from, to).filter((w) => w.end - w.start >= RULES.minSessionMinutes) : [];
  const largest = windows.reduce((m, w) => Math.max(m, w.end - w.start), 0);

  let mode: CapacityMode;
  let max: number;
  let reason: string;
  if (status === 'off') { mode = 'none'; max = 0; reason = 'Dzień wolny od planu — nic nie narzucam.'; }
  else if (status === 'vacation') { mode = 'none'; max = 0; reason = 'Urlop — bez obowiązków rozwojowych.'; }
  else if (status === 'sick') { mode = 'none'; max = 0; reason = 'Choroba — czas na regenerację. Regularność nie jest za to karana.'; }
  else if (status === 'overloaded') { mode = 'light'; max = RULES.lightMax; reason = 'Przeciążenie — najwyżej krótka, opcjonalna sesja.'; }
  else if (status === 'low') { mode = 'light'; max = RULES.lightMax; reason = 'Mało energii — najpierw regeneracja, lekka sesja tylko jako opcja.'; }
  else if (workMinutes >= RULES.heavyWorkMinutes) { mode = 'light'; max = RULES.lightMax; reason = `${Math.round(workMinutes / 60)} h pracy i dojazdów — co najwyżej lekka sesja albo odpoczynek.`; }
  else if (workMinutes >= RULES.longWorkMinutes) { mode = 'normal'; max = 75; reason = 'Długi dzień pracy — krótsza sesja po regeneracji.'; }
  else if (workMinutes > 0) { mode = 'normal'; max = 120; reason = 'Dzień z pracą — jedna sesja po odpoczynku.'; }
  else { mode = 'long'; max = 180; reason = 'Dzień bez pracy — miejsce na dłuższe tworzenie.'; }

  if (mode !== 'none' && largest < RULES.minSessionMinutes) {
    mode = 'none';
    max = 0;
    reason = clock && clock.today === date ? 'Na dziś nie zostało realne okno czasu.' : 'Brak wolnego okna co najmniej 30 min poza obowiązkami i buforami.';
  }
  max = Math.min(max, largest);
  return {
    date, status, statusSource: source, blocks, workMinutes, privateMinutes, commitments, committedMinutes,
    mode, maxMinutes: max, remainingMinutes: Math.max(0, max - committedMinutes - doneMinutes), doneMinutes, windows, reason,
  };
}

/** Largest free window today starting from now — used by Home ("Kiedy mam czas?"). */
export function nextFreeWindow(ctx: DayContext): Interval | null {
  if (!ctx.windows.length) return null;
  return ctx.windows.reduce((best, w) => (w.end - w.start > best.end - best.start ? w : best), ctx.windows[0]);
}
