import type { PEvent, Proposal } from '../schema';
import { EXERCISE_BY_ID, CATEGORY_SHORT } from '../catalog/exercises';
import { addDays, hhmm, overlaps, plDate, weekDates, weekStart, type Interval } from '../time';
import { dayContext, RULES, type DayContext } from './day';
import { weekStats } from './metrics';
import { alive, newId, type Clock, type Snapshot } from './snapshot';
import { recommendExercises } from './training';

const round15 = (n: number) => Math.round(n / 15) * 15;
const ceil15 = (n: number) => Math.ceil(n / 15) * 15;

export interface DayNote { date: string; text: string; planned: boolean }

export interface WeekPlan {
  proposal: Proposal | null;
  notes: DayNote[];
  target: { base: number; adjusted: number; done: number; planned: number; needed: number };
}

function makeEvent(partial: Partial<PEvent> & Pick<PEvent, 'kind' | 'title' | 'date' | 'start_min' | 'end_min'>, now: number): PEvent {
  return {
    id: newId('ev'), updated_at: now, deleted_at: null, status: 'planned', priority: 2, flexible: true,
    source: 'planner', category: null, exercise_id: null, project_id: null, book_id: null, goal_id: null,
    session_id: null, moved_to: null, proposal_id: null, notes: '', ...partial,
  };
}

/** Pick a start inside a window: after recovery, prefer early evening on work days. */
function placeIn(w: Interval, minutes: number, ctx: DayContext): number {
  const latestStart = w.end - minutes;
  let start = ceil15(w.start);
  if (ctx.workMinutes === 0) {
    // free day: avoid starting at the crack of dawn when a later slot exists
    start = Math.max(start, Math.min(ceil15(Math.max(w.start, 600)), latestStart));
  }
  return Math.min(start, Math.floor(latestStart / 15) * 15);
}

function pickWindow(ctx: DayContext, minutes: number): Interval | null {
  const fits = ctx.windows.filter((w) => w.end - w.start >= minutes);
  if (!fits.length) return null;
  return fits.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
}

/**
 * Generates a proposal for the rest of the week. It plans only as many
 * sessions as are still needed for the (status-adjusted) weekly target,
 * one per day at most, spread out, sized by each day's capacity.
 */
export function generateWeekPlan(snap: Snapshot, clock: Clock, weekOf: string = clock.today): WeekPlan {
  const now = clock.nowMs;
  const stats = weekStats(snap, weekOf, clock.today);
  const dates = weekDates(weekOf).filter((d) => d >= clock.today);
  const contexts = dates.map((d) => dayContext(snap, d, clock));
  const plannedRemaining = stats.commitments.filter((e) => e.status === 'planned' && e.date >= clock.today && (e.kind === 'music' || e.kind === 'training')).length;
  const needed = Math.max(0, stats.adjustedTarget - stats.sessionCount - plannedRemaining);
  const notes: DayNote[] = [];
  const chosen = new Set<string>();
  const hasSession = (d: string) => chosen.has(d) || contexts.find((c) => c.date === d)?.commitments.some((e) => e.kind === 'music' || e.kind === 'training');

  const scoreOf = (c: DayContext) => {
    let s = c.mode === 'long' ? 3 : c.mode === 'normal' ? 2 : c.mode === 'light' ? 0.5 : -99;
    if (c.privateMinutes >= 240) s -= 1.2;
    if (hasSession(addDays(c.date, -1))) s -= 0.6;
    if (hasSession(addDays(c.date, 1))) s -= 0.6;
    return s;
  };

  const candidates = contexts.filter((c) => c.mode !== 'none' && c.remainingMinutes >= RULES.minSessionMinutes && !hasSession(c.date));
  const picks: DayContext[] = [];
  while (picks.length < needed) {
    const pool = candidates.filter((c) => !chosen.has(c.date));
    if (!pool.length) break;
    pool.sort((a, b) => scoreOf(b) - scoreOf(a) || a.date.localeCompare(b.date));
    const best = pool[0];
    // Light days are used only as a last resort, and never two in a row.
    if (best.mode === 'light' && pool.some((c) => c.mode !== 'light')) break;
    chosen.add(best.date);
    picks.push(best);
  }

  const recs = recommendExercises(snap, clock.today, { limit: 8 });
  const projects = alive(snap.projects).filter((p) => !p.archived && p.stage !== 'released').sort((a, b) => (b.last_worked_at ?? 0) - (a.last_worked_at ?? 0));
  const events: PEvent[] = [];
  picks.sort((a, b) => a.date.localeCompare(b.date));
  let recIdx = 0;
  picks.forEach((ctx, i) => {
    const preferred = snap.profile?.session_default_min ?? 90;
    let minutes = ctx.mode === 'light' ? RULES.lightMax : ctx.mode === 'long' ? Math.max(preferred, 120) : preferred;
    minutes = Math.max(RULES.minSessionMinutes, round15(Math.min(minutes, ctx.remainingMinutes)));
    const w = pickWindow(ctx, minutes);
    if (!w) { notes.push({ date: ctx.date, text: 'Brak okna o potrzebnej długości.', planned: false }); return; }
    const start = placeIn(w, minutes, ctx);
    const train = i % 2 === 0 || !projects.length;
    if (train) {
      const rec = recs.find((r, j) => j >= recIdx && r.exercise.minutes <= minutes) ?? recs[recIdx];
      recIdx++;
      const ex = rec?.exercise;
      events.push(makeEvent({
        kind: ex ? 'training' : 'music',
        title: ex ? ex.title : 'Sesja twórcza',
        category: ex?.category ?? null,
        exercise_id: ex?.id ?? null,
        date: ctx.date, start_min: start, end_min: start + minutes,
        priority: ctx.mode === 'light' ? 3 : 2,
        notes: ex ? `${CATEGORY_SHORT[ex.category]} · ok. ${ex.minutes} min ćwiczenia, reszta czasu na swobodne tworzenie.${rec.reasons.length ? ` Dlaczego: ${rec.reasons.join('; ')}.` : ''}` : '',
      }, now));
    } else {
      const p = projects[(i >> 1) % projects.length];
      events.push(makeEvent({
        kind: 'music', title: `Praca nad: ${p.title}`, project_id: p.id,
        date: ctx.date, start_min: start, end_min: start + minutes, priority: ctx.mode === 'light' ? 3 : 2,
        notes: `Projekt na etapie „${p.stage}”.`,
      }, now));
    }
    notes.push({ date: ctx.date, text: `${ctx.reason} Plan: ${hhmm(start)}–${hhmm(start + minutes)}${ctx.mode === 'light' ? ' (opcjonalnie)' : ''}.`, planned: true });
  });

  for (const ctx of contexts) {
    if (chosen.has(ctx.date)) continue;
    let text = ctx.reason;
    if (ctx.mode !== 'none') {
      if (hasSession(ctx.date)) text = 'Masz już zaplanowaną sesję.';
      else if (needed === 0 || picks.length >= needed) text = 'Cel tygodnia jest już pokryty — dzień zostaje wolny.';
      else if (ctx.mode === 'light') text = `${ctx.reason} Nie planuję — ten dzień lepiej zostawić na odpoczynek.`;
    }
    notes.push({ date: ctx.date, text, planned: false });
  }
  notes.sort((a, b) => a.date.localeCompare(b.date));

  const target = { base: stats.baseTarget, adjusted: stats.adjustedTarget, done: stats.sessionCount, planned: plannedRemaining, needed };
  if (!events.length) return { proposal: null, notes, target };
  const pid = newId('pr');
  for (const e of events) e.proposal_id = pid;
  const proposal: Proposal = {
    id: pid, updated_at: now, deleted_at: null, source: 'planner', status: 'pending', decided_at: null,
    title: `Plan tygodnia od ${plDate(weekStart(weekOf))}`,
    rationale: `Cel: ${stats.adjustedTarget} sesji${stats.adjustedTarget !== stats.baseTarget ? (stats.preStartDays > 0 ? ` (z ${stats.baseTarget} — pierwszy tydzień programu liczony proporcjonalnie)` : ` (z ${stats.baseTarget}, skorygowany o ${stats.protectedDays} dni chronionych)`) : ''}. Zrobione: ${stats.sessionCount}, już zaplanowane: ${plannedRemaining}. Dokładam ${events.length}.`,
    changes: events.map((e) => ({ entity: 'events', before: null, after: e as unknown as Record<string, unknown>, label: `${plDate(e.date)}, ${hhmm(e.start_min)}–${hhmm(e.end_min)} · ${e.title}` })),
  };
  return { proposal, notes, target };
}

export interface Conflict {
  event: PEvent;
  type: 'overlap' | 'day_status' | 'overload';
  reason: string;
}

/** Development commitments that no longer fit reality (new shift, illness, overload). */
export function detectConflicts(snap: Snapshot, clock: Clock, days = 14): Conflict[] {
  const out: Conflict[] = [];
  const end = addDays(clock.today, days);
  for (const e of alive(snap.events)) {
    if (e.status !== 'planned' || (e.kind !== 'music' && e.kind !== 'training' && e.kind !== 'reading' && e.kind !== 'promo')) continue;
    if (e.date < clock.today || e.date > end) continue;
    if (e.date === clock.today && e.end_min <= clock.nowMin) continue;
    const ctx = dayContext(snap, e.date, undefined, { ignoreEventId: e.id });
    if (ctx.status === 'sick' || ctx.status === 'vacation' || ctx.status === 'off') {
      out.push({ event: e, type: 'day_status', reason: ctx.reason });
      continue;
    }
    const hit = ctx.blocks.find((b) => overlaps(b, { start: e.start_min, end: e.end_min }));
    if (hit) {
      out.push({ event: e, type: 'overlap', reason: `Nakłada się z: ${hit.title} (${hhmm(hit.start)}–${hhmm(hit.end)}).` });
      continue;
    }
    const dur = e.end_min - e.start_min;
    if ((e.kind === 'music' || e.kind === 'training') && ctx.mode === 'light' && dur > RULES.lightMax + 15) {
      out.push({ event: e, type: 'overload', reason: `${ctx.reason} Zaplanowane ${dur} min to za dużo.` });
    }
  }
  return out.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.event.start_min - b.event.start_min);
}

/**
 * Resolution policy, in order: fit the same day (shortened if needed) →
 * move to the next day with real capacity and no other session (max one
 * moved item per day, within 7 days) → excuse it. Illness/holiday excuses
 * everything except high-priority items: the weekly target already shrinks,
 * so nothing piles up.
 */
export function resolveConflicts(snap: Snapshot, clock: Clock, conflicts: Conflict[]): Proposal | null {
  if (!conflicts.length) return null;
  const now = clock.nowMs;
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  const receiving = new Set<string>();
  // Working copy so that successive resolutions see each other's placements.
  const work: Snapshot = { ...snap, events: [...snap.events] };
  const commit = (row: PEvent) => {
    const i = work.events.findIndex((x) => x.id === row.id);
    if (i >= 0) work.events[i] = row; else work.events.push(row);
  };
  const sorted = [...conflicts].sort((a, b) => a.event.priority - b.event.priority);
  for (const c of sorted) {
    const e = c.event;
    const dur = e.end_min - e.start_min;
    const before = e as unknown as Record<string, unknown>;
    const push = (b: Record<string, unknown> | null, after: PEvent, label: string) => {
      changes.push({ entity: 'events', before: b, after: after as unknown as Record<string, unknown>, label });
      commit(after);
    };
    const excuse = (why: string) => push(before,
      { ...e, status: 'excused', updated_at: now, proposal_id: pid, notes: [e.notes, why].filter(Boolean).join('\n') },
      `${e.title} (${plDate(e.date)}) → usprawiedliwione: ${why}`);
    if (c.type === 'day_status' && e.priority > 1) { excuse(c.reason); continue; }

    // 1) same day
    if (c.type !== 'day_status') {
      const ctx = dayContext(work, e.date, clock, { ignoreEventId: e.id });
      if (ctx.mode !== 'none') {
        const len = Math.max(RULES.minSessionMinutes, round15(Math.min(dur, ctx.remainingMinutes)));
        const w = pickWindow(ctx, len);
        if (w && len >= RULES.minSessionMinutes) {
          const start = placeIn(w, len, ctx);
          push(before, { ...e, start_min: start, end_min: start + len, updated_at: now, proposal_id: pid },
            `${e.title}: ${hhmm(e.start_min)} → ${hhmm(start)}–${hhmm(start + len)} tego samego dnia${len < dur ? ` (skrócone do ${len} min)` : ''}`);
          continue;
        }
      }
    }
    // 2) another day within a week
    let moved = false;
    for (let i = 1; i <= 7 && !moved; i++) {
      const d = addDays(e.date, i);
      if (receiving.has(d)) continue;
      const ctx = dayContext(work, d, clock);
      if (ctx.mode === 'none' || ctx.commitments.some((x) => x.kind === 'music' || x.kind === 'training')) continue;
      const len = round15(Math.min(dur, ctx.remainingMinutes));
      if (len < RULES.minSessionMinutes) continue;
      const w = pickWindow(ctx, len);
      if (!w) continue;
      const start = placeIn(w, len, ctx);
      const copy: PEvent = { ...e, id: newId('ev'), date: d, start_min: start, end_min: start + len, updated_at: now, source: 'planner', proposal_id: pid, status: 'planned', session_id: null, moved_to: null };
      push(null, copy, `${e.title} → ${plDate(d)}, ${hhmm(start)}–${hhmm(start + len)}${len < dur ? ` (skrócone do ${len} min)` : ''}`);
      push(before, { ...e, status: 'moved', moved_to: copy.id, updated_at: now, proposal_id: pid }, `${e.title} (${plDate(e.date)}) oznaczone jako przeniesione`);
      receiving.add(d);
      moved = true;
    }
    if (!moved) excuse('Brak realnego terminu w najbliższym tygodniu — nie kumuluję zaległości.');
  }
  return {
    id: pid, updated_at: now, deleted_at: null, source: 'conflict', status: 'pending', decided_at: null,
    title: conflicts.length === 1 ? 'Konflikt w planie' : `${conflicts.length} konflikty w planie`,
    rationale: conflicts.map((c) => `• ${c.event.title} (${plDate(c.event.date)}): ${c.reason}`).join('\n'),
    changes,
  };
}

export function eventMinutes(e: PEvent): number {
  return e.end_min - e.start_min;
}

export function exerciseForEvent(e: PEvent) {
  return e.exercise_id ? EXERCISE_BY_ID[e.exercise_id] ?? null : null;
}
