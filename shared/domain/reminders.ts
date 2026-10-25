import type { Profile } from '../schema';
import { blocksFor, dayContext } from './day';
import { weekStats } from './metrics';
import { alive, type Snapshot } from './snapshot';
import { hhmm, weekday, zoned } from '../time';

export interface Reminder { key: string; title: string; body: string; url: string }

/** Pure policy: which reminders are due for this user in the current 15-minute slot. */
export function dueReminders(snap: Snapshot, nowMs: number): Reminder[] {
  const p = snap.profile as Profile | null;
  if (!p || !p.reminders?.enabled) return [];
  const { date, minutes } = zoned(nowMs, p.timezone);
  const slot = (target: number) => minutes >= target && minutes < target + 15;
  const atWork = blocksFor(snap, date).some((b) => (b.kind === 'work') && b.start <= minutes && minutes < b.end);
  const out: Reminder[] = [];
  if (p.reminders.quiet_during_work && atWork) return out;
  if (p.reminders.morning_brief && slot(p.wake_min + 30)) {
    const ctx = dayContext(snap, date);
    const evs = ctx.commitments.filter((e) => e.kind === 'music' || e.kind === 'training');
    const body = ctx.mode === 'none'
      ? ctx.reason
      : evs.length ? `Dziś: ${evs.map((e) => `${e.title} o ${hhmm(e.start_min)}`).join(', ')}.` : 'Dziś bez zaplanowanej sesji. Creative Flow jest zawsze pod ręką.';
    out.push({ key: `brief:${date}`, title: 'Twój dzień', body, url: '/' });
  }
  if (p.reminders.session_start) {
    for (const e of alive(snap.events)) {
      if (e.date !== date || e.status !== 'planned' || (e.kind !== 'music' && e.kind !== 'training')) continue;
      if (e.start_min - minutes > 0 && e.start_min - minutes <= 15) {
        out.push({ key: `start:${e.id}`, title: 'Za chwilę sesja', body: `${e.title} o ${hhmm(e.start_min)}. Bez presji — można też przełożyć.`, url: '/tworz' });
      }
    }
  }
  if (p.reminders.weekly_review && weekday(date) === 6 && slot(19 * 60)) {
    const w = weekStats(snap, date, date);
    out.push({ key: `week:${w.weekStart}`, title: 'Podsumowanie tygodnia', body: `${w.sessionCount}/${w.adjustedTarget} sesji, ${Math.round(w.minutes / 60 * 10) / 10} h pracy. Zobacz przegląd.`, url: '/rozwoj/statystyki' });
  }
  return out;
}

