import { describe, expect, it } from 'vitest';
import { detectIntent, parseDay, parseHours, understand } from '../shared/domain/companion';
import { generateMonthPlan, generateWeekPlan } from '../shared/domain/planner';
import { dayContext } from '../shared/domain/day';
import { autoCoverage } from '../shared/domain/sessions';
import { breaks, returnState } from '../shared/domain/workflow';
import { misses } from '../shared/domain/insights';
import { completeLessonRow, openLessonRows, pathProgress } from '../shared/domain/academy';
import { PATHS, LESSON_BY_KEY } from '../shared/catalog/academy';
import { SOURCE_BY_KEY } from '../shared/catalog/sources';
import type { PEvent } from '../shared/schema';
import { addDays } from '../shared/time';
import { care, clock, ev, MONDAY, routine, session, snap } from './fixtures';

describe('companion understands everyday Polish', () => {
  it.each([
    ['Jutro pracuję 12 godzin, przełóż muzykę', 'work_change'],
    ['Nie mam dzisiaj energii', 'low_energy'],
    ['Jestem chory przez kilka dni', 'sick'],
    ['Mam dzisiaj wenę, chcę tworzyć', 'inspired'],
    ['W tym tygodniu chciałbym trochę pouczyć się śpiewu', 'learn'],
    ['Od dawna nie robiłem muzyki, pomóż mi wrócić', 'return'],
    ['Zaplanuj mi tydzień', 'plan_week'],
    ['Jutro mam wolne', 'day_free'],
  ])('%s → %s', (text, intent) => {
    expect(detectIntent(text)).toBe(intent);
  });

  it('parses days and hours', () => {
    expect(parseDay('jutro', MONDAY)).toBe(addDays(MONDAY, 1));
    expect(parseDay('w piątek', MONDAY)).toBe(addDays(MONDAY, 4));
    expect(parseHours('pracuję 12 godzin')).toBe(12);
    expect(parseHours('dwóch kolegów, 10h')).toBe(10);
  });

  it('a 12-hour shift tomorrow moves the planned music and keeps the shift', () => {
    const tue = addDays(MONDAY, 1);
    const music = ev({ id: 'm1', kind: 'music', date: tue, start_min: 1140, end_min: 1230 });
    const s = snap({ events: [music], routines: [routine({ weekdays: [1], start_min: 480, end_min: 960 })] });
    const r = understand('Jutro pracuję 12 godzin, przełóż muzykę', s, clock());
    expect(r.proposal).not.toBeNull();
    const after = r.proposal!.changes.map((c) => c.after as unknown as PEvent);
    const work = after.find((e) => e.kind === 'work')!;
    expect(work.date).toBe(tue);
    expect(work.end_min - work.start_min).toBe(720);
    expect(after.find((e) => e.id === 'm1')?.status).toBe('moved');
    const moved = after.find((e) => e.kind === 'music' && e.id !== 'm1')!;
    expect(moved.date > tue).toBe(true);
    // the proposal never deletes or edits a life commitment
    expect(r.proposal!.changes.every((c) => c.before == null || (c.before as { kind?: string }).kind !== 'work')).toBe(true);
    expect(r.proposal!.status).toBe('pending');
  });

  it('illness records the reason and excuses music instead of failing it', () => {
    const music = ev({ id: 'm2', kind: 'music', date: addDays(MONDAY, 1), start_min: 1140, end_min: 1230 });
    const r = understand('Jestem chory przez kilka dni', snap({ events: [music] }), clock());
    const care = r.proposal!.changes.find((c) => c.entity === 'care')!.after as { signal: string; until: string };
    expect(care.signal).toBe('sick');
    expect(care.until).toBe(addDays(MONDAY, 2));
    expect(r.text).toMatch(/lekarz/);
    expect(r.text).not.toMatch(/diagnoz/i);
  });

  it('low energy offers rest first, never a medical verdict', () => {
    const r = understand('Nie mam dziś energii', snap(), clock());
    expect(r.text).toMatch(/woda/);
    expect(r.proposal?.changes[0].entity).toBe('care');
  });

  it('without AI an unknown message gets an honest answer', () => {
    const r = understand('Co sądzisz o moim nowym bicie?', snap(), clock());
    expect(r.intent).toBe('unknown');
    expect(r.text).toMatch(/wymaga skonfigurowanego AI/);
  });

  it('learning request proposes optional blocks on free days only', () => {
    const r = understand('W tym tygodniu chciałbym trochę pouczyć się śpiewu', snap(), clock());
    const evs = r.proposal!.changes.map((c) => c.after as unknown as PEvent);
    expect(evs.length).toBe(2);
    expect(evs.every((e) => e.lesson_key === 'vocal-breath' && e.priority === 3)).toBe(true);
  });
});

describe('creative workflow', () => {
  it('a spontaneous session covers same-day planned music automatically, not other days', () => {
    const today = ev({ kind: 'music', date: MONDAY, start_min: 1200, end_min: 1260 });
    const later = ev({ kind: 'music', date: addDays(MONDAY, 2), start_min: 1200, end_min: 1260 });
    const s = session({ date: MONDAY, startH: 12, minutes: 50 });
    expect(autoCoverage(s, [today, later], 'UTC').map((e) => e.id)).toEqual([today.id]);
  });

  it('a learning block is never covered by a creative session', () => {
    const lesson = ev({ kind: 'training', lesson_key: 'vocal-breath', date: MONDAY, start_min: 1200, end_min: 1230 });
    expect(autoCoverage(session({ date: MONDAY, startH: 12, minutes: 120 }), [lesson], 'UTC')).toHaveLength(0);
  });
});

describe('planning v3', () => {
  it('after a long session the next day is lighter', () => {
    const s = snap({ sessions: [session({ date: MONDAY, startH: 14, minutes: 240 })] });
    const ctx = dayContext(s, addDays(MONDAY, 1));
    expect(ctx.maxMinutes).toBeLessThanOrEqual(60);
    expect(ctx.reason).toMatch(/Wczoraj/);
  });

  it('return mode: after 10 days without music, at most two short sessions and no catching up', () => {
    const p = snap().profile!;
    const s = snap({ profile: { ...p, start_date: '2026-09-01' }, sessions: [session({ date: addDays(MONDAY, -12), minutes: 60 })] });
    expect(returnState(s, MONDAY).active).toBe(true);
    const plan = generateWeekPlan(s, clock());
    const evs = plan.proposal!.changes.map((c) => c.after as unknown as PEvent).filter((e) => e.kind === 'music');
    expect(evs.length).toBeLessThanOrEqual(2);
    expect(evs.every((e) => e.end_min - e.start_min <= 45)).toBe(true);
  });

  it('breaks are history with a return date', () => {
    const s = snap({ sessions: [session({ date: addDays(MONDAY, -20), minutes: 60 }), session({ date: addDays(MONDAY, -5), minutes: 60 })] });
    const b = breaks(s, MONDAY);
    expect(b[0].days).toBe(14);
    expect(b[0].returnedOn).toBe(addDays(MONDAY, -5));
  });

  it('plans an optional learning block when a path is active', () => {
    const rows = openLessonRows(snap(), 'theory-rhythm', 1);
    const s = snap({ learning: rows });
    const plan = generateWeekPlan(s, clock());
    const lesson = plan.proposal!.changes.map((c) => c.after as unknown as PEvent).find((e) => e.lesson_key);
    expect(lesson?.title).toMatch(/Nauka/);
    // learning does not reduce the music rhythm
    expect(plan.proposal!.changes.filter((c) => !(c.after as unknown as PEvent).lesson_key).length).toBe(4);
  });

  it('month plan spans the rest of the month in one proposal', () => {
    const m = generateMonthPlan(snap(), clock());
    const dates = m.proposal!.changes.map((c) => (c.after as unknown as PEvent).date);
    expect(Math.max(...dates.map((d) => Date.parse(d)))).toBeLessThanOrEqual(Date.parse('2026-10-31'));
    expect(new Set(m.proposal!.changes.map((c) => c.after.proposal_id)).size).toBe(1);
  });

  it('a skipped block on a 10-hour day is "couldn\'t", on a free day "time was there"', () => {
    const s = snap({
      routines: [routine({ weekdays: [0], start_min: 420, end_min: 1020 })],
      events: [
        ev({ kind: 'music', date: addDays(MONDAY, -7), start_min: 1140, end_min: 1200, status: 'skipped' }),
        ev({ kind: 'music', date: addDays(MONDAY, -2), start_min: 1140, end_min: 1200, status: 'skipped' }),
      ],
      care: [care({ date: addDays(MONDAY, -30), signal: 'energized' })],
    });
    const m = misses(s, MONDAY);
    expect(m.find((x) => x.date === addDays(MONDAY, -7))?.reason).toBe('heavy_day');
    expect(m.find((x) => x.date === addDays(MONDAY, -2))?.reason).toBe('capacity');
  });
});

describe('academy', () => {
  it('every lesson has practice and only known sources', () => {
    for (const p of PATHS) for (const l of p.lessons) {
      expect(l.practice.length, l.key).toBeGreaterThan(0);
      for (const src of l.sources) expect(SOURCE_BY_KEY[src], `${l.key}:${src}`).toBeDefined();
    }
  });

  it('no artificial writing quotas in practice steps', () => {
    for (const p of PATHS) for (const l of p.lessons) for (const pr of l.practice) for (const step of pr.steps) {
      expect(step, l.key).not.toMatch(/napisz \d+ wers|stwórz \d+ (różne )?refren/i);
    }
  });

  it('progress counts completed lessons, not time', () => {
    let s = snap({ learning: openLessonRows(snap(), 'vocal-breath', 1) });
    expect(pathProgress(s, 'vocal').state).toBe('active');
    expect(pathProgress(s, 'vocal').done).toBe(0);
    s = { ...s, learning: [...s.learning.filter((r) => r.id !== 'vocal-breath'), completeLessonRow(s, 'vocal-breath', true, 2)!] };
    expect(pathProgress(s, 'vocal').done).toBe(1);
    expect(pathProgress(s, 'vocal').next?.key).toBe('vocal-warmup');
    expect(LESSON_BY_KEY['vocal-warmup'].path).toBe('vocal');
  });
});
