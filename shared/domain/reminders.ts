import type { Profile } from '../schema';
import { blocksFor, dayContext } from './day';
import { weekStats } from './metrics';
import { alive, type Snapshot } from './snapshot';
import { returnState } from './workflow';
import { hhmm, weekday, zoned } from '../time';

export interface Reminder { key: string; title: string; body: string; url: string }

/** Hard cap enforced by the sender (worker/push.ts) over a rolling 24 h. */
export const MAX_PER_DAY = 2;

/**
 * Pure policy: which reminders are due for this user in the current
 * 15-minute slot, most useful first. Quiet during work, nothing on sick or
 * off days except the plain morning note, never a guilt trip.
 */
export function dueReminders(snap: Snapshot, nowMs: number): Reminder[] {
  const p = snap.profile as Profile | null;
  if (!p || !p.reminders?.enabled) return [];
  const { date, minutes } = zoned(nowMs, p.timezone);
  const slot = (target: number) => minutes >= target && minutes < target + 15;
  const atWork = blocksFor(snap, date).some((b) => (b.kind === 'work') && b.start <= minutes && minutes < b.end);
  const out: Reminder[] = [];
  if (p.reminders.quiet_during_work && atWork) return out;
  const ctx = dayContext(snap, date);
  const resting = ctx.status === 'sick' || ctx.status === 'vacation' || ctx.status === 'off';
  if (p.reminders.session_start && !resting) {
    for (const e of alive(snap.events)) {
      if (e.date !== date || e.status !== 'planned' || (e.kind !== 'music' && e.kind !== 'training')) continue;
      if (e.start_min - minutes > 0 && e.start_min - minutes <= 15) {
        out.push({ key: `start:${e.id}`, title: e.lesson_key ? 'Za chwilę nauka (opcjonalnie)' : 'Za chwilę czas na muzykę', body: `${e.title} o ${hhmm(e.start_min)}. Można też przełożyć — bez konsekwencji.`, url: '/tworz' });
      }
    }
  }
  if (p.reminders.morning_brief && slot(p.wake_min + 30)) {
    const evs = ctx.commitments.filter((e) => e.kind === 'music' || e.kind === 'training');
    const body = ctx.mode === 'none'
      ? ctx.reason
      : evs.length ? `Dziś: ${evs.map((e) => `${e.title} o ${hhmm(e.start_min)}`).join(', ')}.` : 'Dziś bez planu. Jeśli przyjdzie ochota — Twórz jest pod ręką.';
    out.push({ key: `brief:${date}`, title: 'Twój dzień', body, url: '/' });
  }
  // Return nudge: once per break, early evening, only on a day with real time and no plan.
  const ret = returnState(snap, date);
  if (!resting && ret.active && ret.gapDays >= 7 && ctx.mode !== 'none' && !ctx.commitments.length && slot(Math.min(19 * 60, (p.bed_min > 600 ? p.bed_min : 1320) - 180))) {
    out.push({ key: `return:${ret.lastSession ?? 'none'}`, title: 'Bez nadrabiania', body: `${ret.gapDays} dni bez muzyki. Dziś jest wolne okno — wystarczy 20 minut, żeby wrócić.`, url: '/tworz' });
  }
  if (p.reminders.weekly_review && weekday(date) === 6 && slot(19 * 60)) {
    const w = weekStats(snap, date, date);
    out.push({ key: `week:${w.weekStart}`, title: 'Tydzień w muzyce', body: `${w.sessionCount} sesji, ${Math.round(w.minutes / 60 * 10) / 10} h. Zobacz, jak wyglądał rytm.`, url: '/ty/rytm' });
  }
  return out;
}
