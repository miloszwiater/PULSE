import { describe, expect, it } from 'vitest';
import { dayContext } from '../shared/domain/day';
import { detectConflicts, generateWeekPlan, resolveConflicts } from '../shared/domain/planner';
import { addDays } from '../shared/time';
import { care, clock, dayState, ev, MONDAY, routine, snap } from './fixtures';
import type { PEvent } from '../shared/schema';

const plannedEvents = (p: ReturnType<typeof generateWeekPlan>) => (p.proposal?.changes ?? []).map((c) => c.after as unknown as PEvent);

describe('capacity', () => {
  it('a 10-hour shift allows at most a light session', () => {
    const s = snap({ routines: [routine({ weekdays: [0], start_min: 420, end_min: 1020 })] });
    const ctx = dayContext(s, MONDAY);
    expect(ctx.workMinutes).toBe(600);
    expect(ctx.mode).toBe('light');
    expect(ctx.maxMinutes).toBeLessThanOrEqual(30);
  });

  it('a free day without work allows long creation', () => {
    const ctx = dayContext(snap(), '2026-10-31');
    expect(ctx.mode).toBe('long');
    expect(ctx.maxMinutes).toBeGreaterThanOrEqual(120);
  });

  it('keeps an hour of recovery after work', () => {
    const s = snap({ routines: [routine({ weekdays: [0], start_min: 480, end_min: 960 })] });
    const ctx = dayContext(s, MONDAY);
    expect(ctx.windows.every((w) => w.start >= 1020 || w.end <= 480 - 15)).toBe(true);
  });
});

describe('week generation', () => {
  it('does not plan long trainings on 10-hour days; uses free days instead', () => {
    // Mon–Fri 10 h shifts, weekend free, target 2
    const s = snap({
      profile: { ...snap().profile!, weekly_session_target: 2 },
      routines: [routine({ weekdays: [0, 1, 2, 3, 4], start_min: 420, end_min: 1020 })],
    });
    const plan = generateWeekPlan(s, clock());
    const evs = plannedEvents(plan);
    expect(evs.length).toBe(2);
    for (const e of evs) {
      expect(['2026-10-31', '2026-11-01']).toContain(e.date);
    }
  });

  it('when a heavy day must be used, the session is light (≤30 min) and optional', () => {
    const s = snap({
      profile: { ...snap().profile!, weekly_session_target: 7 },
      routines: [routine({ weekdays: [0, 1, 2, 3, 4, 5, 6], start_min: 420, end_min: 1020 })],
    });
    const evs = plannedEvents(generateWeekPlan(s, clock()));
    // all days are heavy → light days are a last resort, planner refuses to stack them
    for (const e of evs) {
      expect(e.end_min - e.start_min).toBeLessThanOrEqual(30);
      expect(e.priority).toBe(3);
    }
  });

  it('never plans music duties on a day marked as free (off)', () => {
    const s = snap({
      profile: { ...snap().profile!, weekly_session_target: 7 },
      day_states: [dayState('2026-10-31', 'off'), dayState('2026-11-01', 'off')],
    });
    const evs = plannedEvents(generateWeekPlan(s, clock()));
    expect(evs.some((e) => e.date === '2026-10-31' || e.date === '2026-11-01')).toBe(false);
  });

  it('when sick, proposes rest and shrinks the target instead of piling work', () => {
    const s = snap({ care: [care({ date: MONDAY, signal: 'sick', until: addDays(MONDAY, 3) })] });
    const plan = generateWeekPlan(s, clock());
    const evs = plannedEvents(plan);
    expect(evs.some((e) => e.date >= MONDAY && e.date <= addDays(MONDAY, 3))).toBe(false);
    expect(plan.target.adjusted).toBeLessThan(plan.target.base);
    expect(plan.notes.find((n) => n.date === MONDAY)?.text).toMatch(/Choroba/);
  });

  it('plans only what is still needed and at most one session per day', () => {
    const s = snap({ events: [ev({ date: '2026-10-27', start_min: 1080, end_min: 1170 })] });
    const plan = generateWeekPlan(s, clock());
    const evs = plannedEvents(plan);
    expect(plan.target.needed).toBe(3);
    expect(evs.length).toBe(3);
    const days = new Set(evs.map((e) => e.date));
    expect(days.size).toBe(evs.length);
    expect(days.has('2026-10-27')).toBe(false);
  });

  it('respects private time and does not plan inside it', () => {
    const s = snap({ events: [ev({ kind: 'relationship', title: 'Kolacja', date: '2026-10-31', start_min: 600, end_min: 1380 })] });
    const evs = plannedEvents(generateWeekPlan(s, clock()));
    for (const e of evs.filter((x) => x.date === '2026-10-31')) {
      expect(e.end_min <= 600 - 15 || e.start_min >= 1380).toBe(true);
    }
  });
});

describe('conflicts', () => {
  it('a sudden shift change surfaces a conflict and moves the session sensibly', () => {
    const session = ev({ kind: 'training', date: '2026-10-27', start_min: 1080, end_min: 1170, priority: 2 });
    const shift = ev({ kind: 'work', title: 'Zmiana', date: '2026-10-27', start_min: 840, end_min: 1320 });
    const s = snap({ events: [session, shift] });
    const conflicts = detectConflicts(s, clock());
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe('overlap');
    const p = resolveConflicts(s, clock(), conflicts)!;
    // the session lands in a real slot: same day before the shift (shortened to the day's cap) or a later day
    const placed = p.changes.map((c) => c.after as unknown as PEvent).find((e) => e.status === 'planned')!;
    expect(placed).toBeTruthy();
    if (placed.date === '2026-10-27') {
      expect(placed.end_min).toBeLessThanOrEqual(840 - 15);
      expect(placed.end_min - placed.start_min).toBeLessThanOrEqual(75);
    } else {
      expect(placed.date > '2026-10-27').toBe(true);
      const orig = p.changes.find((c) => c.before != null)?.after as unknown as PEvent;
      expect(orig.status).toBe('moved');
      expect(orig.moved_to).toBe(placed.id);
    }
  });

  it('moves to another day when the conflicted day has no room left', () => {
    const session = ev({ kind: 'training', date: '2026-10-27', start_min: 1080, end_min: 1170 });
    const shift = ev({ kind: 'work', title: 'Zmiana', date: '2026-10-27', start_min: 420, end_min: 1320 });
    const s = snap({ events: [session, shift] });
    const p = resolveConflicts(s, clock(), detectConflicts(s, clock()))!;
    const moved = p.changes.find((c) => c.before == null)?.after as unknown as PEvent;
    expect(moved.date).toBe('2026-10-28');
    const orig = p.changes.find((c) => c.before != null)?.after as unknown as PEvent;
    expect(orig.status).toBe('moved');
    expect(orig.moved_to).toBe(moved.id);
  });

  it('does not dump all missed sessions onto the next day', () => {
    const tue = '2026-10-27';
    const sessions = [600, 840, 1080].map((st) => ev({ kind: 'music', date: tue, start_min: st, end_min: st + 60 }));
    const s = snap({ events: sessions, day_states: [dayState(tue, 'normal')] });
    // whole-day work appears on Tuesday
    s.events.push(ev({ kind: 'work', title: 'Nagła zmiana', date: tue, start_min: 420, end_min: 1380 }));
    const conflicts = detectConflicts(s, clock());
    expect(conflicts).toHaveLength(3);
    const p = resolveConflicts(s, clock(), conflicts)!;
    const created = p.changes.filter((c) => c.before == null).map((c) => c.after as unknown as PEvent);
    const perDay = new Map<string, number>();
    for (const e of created) perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
    for (const n of perDay.values()) expect(n).toBe(1);
  });

  it('illness excuses normal-priority sessions instead of moving them', () => {
    const e = ev({ kind: 'training', date: '2026-10-28', start_min: 1080, end_min: 1170, priority: 2 });
    const s = snap({ events: [e], care: [care({ date: MONDAY, signal: 'sick', until: '2026-10-29' })] });
    const conflicts = detectConflicts(s, clock());
    expect(conflicts[0].type).toBe('day_status');
    const p = resolveConflicts(s, clock(), conflicts)!;
    expect((p.changes[0].after as unknown as PEvent).status).toBe('excused');
    expect(p.changes.some((c) => c.before == null)).toBe(false);
  });

  it('flags an overlong session on a 10-hour day as overload', () => {
    const e = ev({ kind: 'training', date: MONDAY, start_min: 1140, end_min: 1260 });
    const s = snap({ events: [e], routines: [routine({ weekdays: [0], start_min: 420, end_min: 1020 })] });
    const c = detectConflicts(s, clock());
    expect(c[0]?.type).toBe('overload');
  });

  it('places two same-day relocations into different slots', () => {
    const tue = '2026-10-27';
    const a = ev({ kind: 'music', date: tue, start_min: 900, end_min: 960 });
    const b = ev({ kind: 'music', date: tue, start_min: 960, end_min: 1020 });
    const s = snap({ events: [a, b, ev({ kind: 'private', title: 'Wizyta', date: tue, start_min: 870, end_min: 1050 })] });
    const p = resolveConflicts(s, clock(), detectConflicts(s, clock()))!;
    const afters = p.changes.map((c) => c.after as unknown as PEvent).filter((e) => e.status === 'planned');
    for (let i = 0; i < afters.length; i++) for (let j = i + 1; j < afters.length; j++) {
      const x = afters[i]; const y = afters[j];
      if (x.date === y.date) expect(x.end_min <= y.start_min || y.end_min <= x.start_min).toBe(true);
    }
  });
});
