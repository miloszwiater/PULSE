import type { PEvent, Proposal } from '../schema';
import { EXERCISE_BY_ID } from '../catalog/exercises';
import { addDays, addMonths, daysBetween, hhmm, monthStart, overlaps, plDate, weekDates, weekStart, type Interval } from '../time';
import { nextLessonToSuggest } from './academy';
import { returnState } from './workflow';
import { dayContext, RULES, type DayContext } from './day';
import { weekStats } from './metrics';
import { alive, newId, type Clock, type Snapshot } from './snapshot';

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
    session_id: null, moved_to: null, proposal_id: null, notes: '', lesson_key: null, ...partial,
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

const isLearning = (e: PEvent) => !!e.lesson_key;
const isMusic = (e: PEvent) => (e.kind === 'music' || e.kind === 'training') && !isLearning(e);

export interface PlanOptions {
  /** Plan the whole week even if it is in the future (month planning). */
  weekOf?: string;
  /** Working copy events already proposed for earlier weeks. */
  extra?: PEvent[];
}

/**
 * Generates a proposal for the rest of the week. It plans only as many
 * music sessions as are still needed for the (status-adjusted) weekly
 * target, one per day at most, spread out, sized by each day's capacity.
 * Long sessions already done count double for the planner (not for
 * regularity), so a big spontaneous night lowers the pressure.
 * In return mode (≥7 days without music) it proposes at most two short
 * sessions and nothing to catch up. Learning blocks are optional extras.
 */
export function generateWeekPlan(snap: Snapshot, clock: Clock, weekOf: string = clock.today): WeekPlan {
  const now = clock.nowMs;
  const stats = weekStats(snap, weekOf, clock.today);
  const dates = weekDates(weekOf).filter((d) => d >= clock.today);
  const contexts = dates.map((d) => dayContext(snap, d, d === clock.today ? clock : undefined));
  const ret = returnState(snap, clock.today);
  const plannedRemaining = stats.commitments.filter((e) => e.status === 'planned' && e.date >= clock.today && isMusic(e)).length;
  const longCredit = stats.sessions.filter((x) => x.active_seconds >= RULES.longSessionMinutes * 60).length;
  let needed = Math.max(0, stats.adjustedTarget - stats.sessionCount - longCredit - plannedRemaining);
  if (ret.active) needed = Math.min(needed, 2);
  const notes: DayNote[] = [];
  const chosen = new Set<string>();
  const hasSession = (d: string) => chosen.has(d) || contexts.find((c) => c.date === d)?.commitments.some(isMusic);

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

  const events: PEvent[] = [];
  picks.sort((a, b) => a.date.localeCompare(b.date));
  for (const ctx of picks) {
    const preferred = snap.profile?.session_default_min ?? 90;
    let minutes = ctx.mode === 'light' ? RULES.lightMax : ctx.mode === 'long' ? Math.max(preferred, 120) : preferred;
    if (ret.active) minutes = Math.min(minutes, 45);
    minutes = Math.max(RULES.minSessionMinutes, round15(Math.min(minutes, ctx.remainingMinutes)));
    const w = pickWindow(ctx, minutes);
    if (!w) { notes.push({ date: ctx.date, text: 'Brak okna o potrzebnej długości.', planned: false }); continue; }
    const start = placeIn(w, minutes, ctx);
    events.push(makeEvent({
      kind: 'music', title: ret.active ? 'Krótki powrót do muzyki' : 'Czas na muzykę',
      date: ctx.date, start_min: start, end_min: start + minutes, priority: ctx.mode === 'light' ? 3 : 2,
      notes: ret.active ? 'Bez nadrabiania — wystarczy usiąść i zacząć.' : '',
    }, now));
    notes.push({ date: ctx.date, text: `${ctx.reason} Muzyka: ${hhmm(start)}–${hhmm(start + minutes)}${ctx.mode === 'light' ? ' (opcjonalnie)' : ''}.`, planned: true });
  }

  // Optional learning: only with an active path, never in return mode, never on a music day.
  const perWeek = snap.profile?.learning_per_week ?? 1;
  const lesson = nextLessonToSuggest(snap);
  const learningPlanned = alive(snap.events).filter((e) => isLearning(e) && weekStart(e.date) === weekStart(weekOf) && !['cancelled', 'moved'].includes(e.status)).length;
  if (lesson && !ret.active && perWeek > learningPlanned) {
    const pool = contexts.filter((c) => (c.mode === 'normal' || c.mode === 'long') && !hasSession(c.date)
      && !alive(snap.events).some((e) => e.date === c.date && isLearning(e)));
    pool.sort((a, b) => b.remainingMinutes - a.remainingMinutes || a.date.localeCompare(b.date));
    for (const ctx of pool.slice(0, perWeek - learningPlanned)) {
      const len = Math.max(RULES.minSessionMinutes, ceil15(Math.min(lesson.minutes, 60)));
      if (ctx.remainingMinutes < len) continue;
      const w = pickWindow(ctx, len);
      if (!w) continue;
      const start = placeIn(w, len, ctx);
      events.push(makeEvent({
        kind: 'training', title: `Nauka: ${lesson.title}`, lesson_key: lesson.key,
        date: ctx.date, start_min: start, end_min: start + len, priority: 3,
        notes: 'Opcjonalna nauka z Akademii. Można pominąć bez konsekwencji.',
      }, now));
      chosen.add(ctx.date);
      notes.push({ date: ctx.date, text: `Opcjonalna nauka: ${lesson.title}, ${hhmm(start)}–${hhmm(start + len)}.`, planned: true });
    }
  }

  for (const ctx of contexts) {
    if (chosen.has(ctx.date)) continue;
    let text = ctx.reason;
    if (ctx.mode !== 'none') {
      if (hasSession(ctx.date)) text = 'Masz już zaplanowany czas na muzykę.';
      else if (needed === 0 || picks.length >= needed) text = 'Rytm tygodnia jest pokryty — dzień zostaje wolny.';
      else if (ctx.mode === 'light') text = `${ctx.reason} Nie planuję — ten dzień lepiej zostawić na odpoczynek.`;
    }
    notes.push({ date: ctx.date, text, planned: false });
  }
  notes.sort((a, b) => a.date.localeCompare(b.date));

  const target = { base: stats.baseTarget, adjusted: stats.adjustedTarget, done: stats.sessionCount, planned: plannedRemaining, needed };
  if (!events.length) return { proposal: null, notes, target };
  const pid = newId('pr');
  for (const e of events) e.proposal_id = pid;
  const why: string[] = [];
  why.push(`Rytm: ${stats.adjustedTarget} sesji w tym tygodniu${stats.adjustedTarget !== stats.baseTarget ? ` (z ${stats.baseTarget}, skorygowane o ${stats.protectedDays} dni chronionych)` : ''}.`);
  why.push(`Zrobione: ${stats.sessionCount}${longCredit ? ` (w tym ${longCredit} długa — liczy się podwójnie przy planowaniu)` : ''}, już zaplanowane: ${plannedRemaining}.`);
  if (ret.active) why.push(`Tryb powrotu: ${ret.gapDays} dni bez muzyki — proponuję mało i krótko, bez nadrabiania.`);
  why.push('To propozycja: każdy blok można przesunąć, skrócić albo odrzucić.');
  const proposal: Proposal = {
    id: pid, updated_at: now, deleted_at: null, source: 'planner', status: 'pending', decided_at: null,
    title: `Plan tygodnia od ${plDate(weekStart(weekOf))}`,
    rationale: why.join(' '),
    changes: events.map((e) => ({ entity: 'events', before: null, after: e as unknown as Record<string, unknown>, label: `${plDate(e.date)}, ${hhmm(e.start_min)}–${hhmm(e.end_min)} · ${e.title}` })),
  };
  return { proposal, notes, target };
}

/**
 * Month plan = the week planner run week by week until the end of the month,
 * each week seeing the blocks proposed for the previous ones. One proposal,
 * so the person approves (or rejects) the month as a whole and can undo it.
 */
export function generateMonthPlan(snap: Snapshot, clock: Clock): { proposal: Proposal | null; weeks: { weekStart: string; planned: number }[] } {
  const end = addDays(monthStart(addMonths(clock.today, 1)), -1);
  let work: Snapshot = { ...snap, events: [...snap.events] };
  const all: Proposal['changes'] = [];
  const weeks: { weekStart: string; planned: number }[] = [];
  for (let ws = weekStart(clock.today); ws <= end; ws = addDays(ws, 7)) {
    const plan = generateWeekPlan(work, clock, ws < clock.today ? clock.today : ws);
    const evs = (plan.proposal?.changes ?? []).map((c) => c.after as unknown as PEvent).filter((e) => e.date <= end);
    weeks.push({ weekStart: ws, planned: evs.length });
    work = { ...work, events: [...work.events, ...evs] };
    all.push(...(plan.proposal?.changes ?? []).filter((c) => (c.after as unknown as PEvent).date <= end));
  }
  if (!all.length) return { proposal: null, weeks };
  const pid = newId('pr');
  const changes = all.map((c) => ({ ...c, after: { ...c.after, proposal_id: pid } }));
  return {
    weeks,
    proposal: {
      id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'planner', status: 'pending', decided_at: null,
      title: `Plan do końca miesiąca (${plDate(end)})`,
      rationale: `Tydzień po tygodniu, według grafiku pracy, dni wolnych i energii. ${weeks.map((w) => `od ${plDate(w.weekStart)}: ${w.planned}`).join(', ')}. Plan dalszych tygodni jest szkicem — PULSE zaproponuje korekty, gdy grafik się zmieni.`,
      changes,
    },
  };
}

/** Planned items from a break that are now in the past: closing them is offered, never automatic. */
export function staleAfterBreak(snap: Snapshot, clock: Clock): PEvent[] {
  return alive(snap.events).filter((e) => e.status === 'planned' && e.date < clock.today
    && ['music', 'training', 'reading', 'promo'].includes(e.kind) && daysBetween(e.date, clock.today) <= 60);
}

export function closeStaleProposal(snap: Snapshot, clock: Clock): Proposal | null {
  const stale = staleAfterBreak(snap, clock);
  if (!stale.length) return null;
  const pid = newId('pr');
  return {
    id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'planner', status: 'pending', decided_at: null,
    title: 'Zamknij stare plany bez kary',
    rationale: `${stale.length} zaplanowanych bloków z przeszłości nie zostało oznaczonych. Zamknięcie ich jako usprawiedliwione czyści plan i nie wpływa na rytm — nic nie trzeba nadrabiać.`,
    changes: stale.map((e) => ({
      entity: 'events', before: e as unknown as Record<string, unknown>,
      after: { ...e, status: 'excused', updated_at: clock.nowMs, proposal_id: pid } as unknown as Record<string, unknown>,
      label: `${plDate(e.date)} · ${e.title} → zamknięte bez kary`,
    })),
  };
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
export function resolveConflicts(snap: Snapshot, clock: Clock, conflicts: Conflict[], opts: { preferMove?: boolean; title?: string } = {}): Proposal | null {
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
    if (c.type === 'day_status' && e.priority > 1 && !opts.preferMove) { excuse(c.reason); continue; }

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
    title: opts.title ?? (conflicts.length === 1 ? 'Konflikt w planie' : `${conflicts.length} konflikty w planie`),
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
