import type { Session, Workflow } from '../schema';
import { addDays, daysBetween } from '../time';
import { effectiveStatus } from './day';
import { alive, type Snapshot } from './snapshot';
import { countsAsSession, sessionDate } from './sessions';

/** Quick-start lengths offered on Twórz. null = open-ended session. */
export const QUICK_LENGTHS: (number | null)[] = [null, 25, 45, 60, 90, 120];

/** Defaults offered once, when the person has no workflows of their own yet. Nothing is created without a tap. */
export const STARTER_WORKFLOWS: Pick<Workflow, 'name' | 'minutes' | 'focus' | 'tone' | 'intention'>[] = [
  { name: 'Wieczór w studiu', minutes: 90, focus: true, tone: 0, intention: '' },
  { name: 'Szybki szkic', minutes: 25, focus: false, tone: 3, intention: '' },
  { name: 'Długa sesja', minutes: null, focus: true, tone: 5, intention: '' },
];

export function workflowsSorted(snap: Snapshot): Workflow[] {
  return alive(snap.workflows).sort((a, b) => a.position - b.position || (b.last_used_at ?? 0) - (a.last_used_at ?? 0));
}

export interface DayActivity { date: string; minutes: number; sessions: number; protected: boolean }

/** Minutes of creative time per day — the raw material of the rhythm ring and the heatmap. */
export function activity(snap: Snapshot, from: string, to: string): DayActivity[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const map = new Map<string, { minutes: number; sessions: number }>();
  for (const s of alive(snap.sessions)) {
    if (!countsAsSession(s)) continue;
    const d = sessionDate(s, tz);
    if (d < from || d > to) continue;
    const cur = map.get(d) ?? { minutes: 0, sessions: 0 };
    cur.minutes += s.active_seconds / 60;
    cur.sessions += 1;
    map.set(d, cur);
  }
  const out: DayActivity[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const st = effectiveStatus(snap, d).status;
    const v = map.get(d);
    out.push({ date: d, minutes: Math.round(v?.minutes ?? 0), sessions: v?.sessions ?? 0, protected: st === 'sick' || st === 'vacation' || st === 'off' });
  }
  return out;
}

export interface Break {
  from: string;
  to: string;
  days: number;
  /** Days covered by illness, holiday or days off — a break for a reason. */
  protectedDays: number;
  /** Date of the session that ended the break; null while it lasts. */
  returnedOn: string | null;
}

export const BREAK_DAYS = 7;

/**
 * Breaks of ≥7 days without a counted session, newest first. They are part
 * of the history, not failures: the UI shows them with the return that followed.
 */
export function breaks(snap: Snapshot, today: string): Break[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const days = [...new Set(alive(snap.sessions).filter(countsAsSession).map((s) => sessionDate(s, tz)))].sort();
  const out: Break[] = [];
  const prot = (from: string, to: string) => {
    let n = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const st = effectiveStatus(snap, d).status;
      if (st === 'sick' || st === 'vacation' || st === 'off') n++;
    }
    return n;
  };
  for (let i = 1; i < days.length; i++) {
    const gap = daysBetween(days[i - 1], days[i]) - 1;
    if (gap >= BREAK_DAYS) {
      const from = addDays(days[i - 1], 1);
      const to = addDays(days[i], -1);
      out.push({ from, to, days: gap, protectedDays: prot(from, to), returnedOn: days[i] });
    }
  }
  const last = days[days.length - 1];
  if (last) {
    const gap = daysBetween(last, today);
    if (gap >= BREAK_DAYS) out.push({ from: addDays(last, 1), to: today, days: gap, protectedDays: prot(addDays(last, 1), today), returnedOn: null });
  }
  return out.reverse();
}

export interface ReturnState { active: boolean; gapDays: number; lastSession: string | null; protectedDays: number }

/**
 * Return mode: a week or more without music. The planner then proposes short,
 * few sessions and never asks to "catch up"; old plans can be closed without penalty.
 */
export function returnState(snap: Snapshot, today: string): ReturnState {
  const b = breaks(snap, today)[0];
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const last = alive(snap.sessions).filter(countsAsSession).map((s) => sessionDate(s, tz)).sort().pop() ?? null;
  if (b && b.returnedOn == null) return { active: true, gapDays: b.days, lastSession: last, protectedDays: b.protectedDays };
  return { active: false, gapDays: 0, lastSession: last, protectedDays: 0 };
}

/** Sessions in the last N days that were started without any plan (spontaneous). */
export function spontaneousShare(snap: Snapshot, today: string, days = 28): { spontaneous: number; planned: number } {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const from = addDays(today, -days + 1);
  const recent = alive(snap.sessions).filter((s: Session) => countsAsSession(s) && sessionDate(s, tz) >= from);
  const coveredIds = new Set(alive(snap.events).filter((e) => e.session_id).map((e) => e.session_id));
  const planned = recent.filter((s) => s.event_id || coveredIds.has(s.id)).length;
  return { spontaneous: recent.length - planned, planned };
}
