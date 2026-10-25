import { COMMITMENT_KINDS, type Goal, type Outcome, type PEvent, type Session, type SkillCategory } from '../schema';
import { addDays, daysBetween, weekDates, weekStart } from '../time';
import { effectiveStatus } from './day';
import { alive, type Snapshot } from './snapshot';
import { categoryOfSession, countsAsSession, sessionDate } from './sessions';

export interface WeekStats {
  weekStart: string;
  sessions: Session[];
  sessionCount: number;
  minutes: number;
  byCategory: Partial<Record<SkillCategory, number>>;
  outcomes: Partial<Record<Outcome, number>>;
  /** Development commitments planned this week (denominator). */
  commitments: PEvent[];
  fulfilled: number;
  partial: number;
  skipped: number;
  open: number;
  excused: number;
  planRate: number | null;
  protectedDays: number;
  /** Days of this week before the program started (part of protectedDays). */
  preStartDays: number;
  baseTarget: number;
  adjustedTarget: number;
  state: 'kept' | 'missed' | 'protected' | 'in_progress';
}

const PROTECTED: ReadonlySet<string> = new Set(['sick', 'vacation', 'off']);

export function weekStats(snap: Snapshot, anyDate: string, today: string): WeekStats {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const ws = weekStart(anyDate);
  const dates = weekDates(ws);
  const sessions = alive(snap.sessions).filter((s) => countsAsSession(s) && weekStart(sessionDate(s, tz)) === ws);
  const minutes = Math.round(sessions.reduce((t, s) => t + s.active_seconds, 0) / 60);
  const byCategory: Partial<Record<SkillCategory, number>> = {};
  const outcomes: Partial<Record<Outcome, number>> = {};
  for (const s of sessions) {
    const c = categoryOfSession(s);
    if (c) byCategory[c] = (byCategory[c] ?? 0) + Math.round(s.active_seconds / 60);
    if (s.outcome !== 'none') outcomes[s.outcome] = (outcomes[s.outcome] ?? 0) + 1;
  }
  const commitments = alive(snap.events).filter((e) =>
    COMMITMENT_KINDS.includes(e.kind) && weekStart(e.date) === ws && !['cancelled', 'moved'].includes(e.status));
  const fulfilled = commitments.filter((e) => e.status === 'done' || e.status === 'covered').length;
  const partial = commitments.filter((e) => e.status === 'partial').length;
  const skipped = commitments.filter((e) => e.status === 'skipped').length;
  const open = commitments.filter((e) => e.status === 'planned').length;
  const excused = commitments.filter((e) => e.status === 'excused').length;
  const denom = fulfilled + partial + skipped + commitments.filter((e) => e.status === 'planned' && e.date < today).length;
  const planRate = denom > 0 ? (fulfilled + partial * 0.5) / denom : null;

  const startDate = snap.profile?.start_date ?? null;
  const preStartDays = startDate ? dates.filter((d) => d < startDate).length : 0;
  const protectedDays = dates.filter((d) => PROTECTED.has(effectiveStatus(snap, d).status) || (startDate != null && d < startDate)).length;
  const baseTarget = snap.profile?.weekly_session_target ?? 4;
  const adjustedTarget = Math.round((baseTarget * (7 - protectedDays)) / 7);

  let state: WeekStats['state'];
  const finished = addDays(ws, 6) < today;
  if (adjustedTarget === 0) state = 'protected';
  else if (sessions.length >= adjustedTarget) state = 'kept';
  else state = finished ? 'missed' : 'in_progress';

  return {
    weekStart: ws, sessions, sessionCount: sessions.length, minutes, byCategory, outcomes, commitments,
    fulfilled, partial, skipped, open, excused, planRate, protectedDays, preStartDays, baseTarget, adjustedTarget, state,
  };
}

export interface Streak {
  current: number;
  best: number;
  keptTotal: number;
  history: { weekStart: string; state: WeekStats['state']; sessions: number; target: number }[];
}

/**
 * Regularity counts whole weeks, never single days. A protected week
 * (illness, holiday, days off) is neutral: it neither adds to nor breaks the
 * streak. The current week only adds once its target is reached.
 */
export function streak(snap: Snapshot, today: string, maxWeeks = 60): Streak {
  const start = snap.profile?.start_date ?? today;
  const history: Streak['history'] = [];
  let ws = weekStart(today);
  for (let i = 0; i < maxWeeks; i++) {
    if (addDays(ws, 6) < start) break;
    const st = weekStats(snap, ws, today);
    history.push({ weekStart: ws, state: st.state, sessions: st.sessionCount, target: st.adjustedTarget });
    ws = addDays(ws, -7);
  }
  let current = 0;
  let broken = false;
  let run = 0;
  let best = 0;
  for (const h of history) {
    if (!broken) {
      if (h.state === 'kept') current++;
      else if (h.state === 'missed') broken = true;
    }
  }
  for (const h of [...history].reverse()) {
    if (h.state === 'kept') { run++; best = Math.max(best, run); }
    else if (h.state === 'missed') run = 0;
  }
  return { current, best, keptTotal: history.filter((h) => h.state === 'kept').length, history };
}

export interface RangeStats {
  from: string;
  to: string;
  minutes: number;
  sessionCount: number;
  demos: number;
  finishedTracks: number;
  booksRead: number;
  promoDone: number;
  attempts: number;
  byCategory: Partial<Record<SkillCategory, number>>;
  commitmentsFulfilled: number;
  commitmentsTotal: number;
}

export function rangeStats(snap: Snapshot, from: string, to: string, today: string): RangeStats {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const inRange = (d: string) => d >= from && d <= to;
  const sessions = alive(snap.sessions).filter((s) => countsAsSession(s) && inRange(sessionDate(s, tz)));
  const byCategory: Partial<Record<SkillCategory, number>> = {};
  for (const s of sessions) {
    const c = categoryOfSession(s);
    if (c) byCategory[c] = (byCategory[c] ?? 0) + Math.round(s.active_seconds / 60);
  }
  const msFrom = Date.parse(from + 'T00:00:00Z') - 14 * 3600e3;
  const msTo = Date.parse(addDays(to, 1) + 'T00:00:00Z') + 14 * 3600e3;
  const commitments = alive(snap.events).filter((e) => COMMITMENT_KINDS.includes(e.kind) && inRange(e.date) && !['cancelled', 'moved', 'excused'].includes(e.status) && (e.status !== 'planned' || e.date < today));
  return {
    from, to,
    minutes: Math.round(sessions.reduce((t, s) => t + s.active_seconds, 0) / 60),
    sessionCount: sessions.length,
    demos: sessions.filter((s) => s.outcome === 'demo').length,
    finishedTracks: sessions.filter((s) => s.outcome === 'finished').length,
    booksRead: alive(snap.books).filter((b) => b.status === 'read' && b.status_changed_at != null && b.status_changed_at >= msFrom && b.status_changed_at < msTo).length,
    promoDone: alive(snap.promo_tasks).filter((t) => t.status === 'done' && t.done_at != null && t.done_at >= msFrom && t.done_at < msTo).length,
    attempts: alive(snap.attempts).filter((a) => inRange(a.date)).length,
    byCategory,
    commitmentsFulfilled: commitments.filter((e) => e.status === 'done' || e.status === 'covered').length,
    commitmentsTotal: commitments.length,
  };
}

/** Goal progress is computed from real records when the goal has a metric. */
export function goalProgress(snap: Snapshot, g: Goal, today: string): { value: number; target: number; ratio: number; auto: boolean } {
  if (g.metric === 'manual') return { value: g.manual_progress, target: g.target, ratio: g.target ? Math.min(1, g.manual_progress / g.target) : 0, auto: false };
  const from = g.start_date ?? snap.profile?.start_date ?? addDays(today, -365);
  const to = g.due_date && g.due_date < today ? g.due_date : today;
  let value = 0;
  if (g.metric === 'demos' || g.metric === 'finished_tracks') {
    // Projects are the source of truth for catalog goals; sessions alone would double count reworks.
    const stages = g.metric === 'demos' ? ['demo', 'recording', 'mix', 'ready', 'released'] : ['ready', 'released'];
    value = alive(snap.projects).filter((p) => stages.includes(p.stage)).length;
  } else {
    const r = rangeStats(snap, from, to, today);
    value = g.metric === 'sessions' ? r.sessionCount : g.metric === 'minutes' ? r.minutes : g.metric === 'books' ? r.booksRead : r.promoDone;
  }
  return { value, target: g.target, ratio: g.target ? Math.min(1, value / g.target) : 0, auto: true };
}

export function dayIndex(snap: Snapshot, today: string): number | null {
  const s = snap.profile?.start_date;
  if (!s) return null;
  return daysBetween(s, today) + 1;
}
