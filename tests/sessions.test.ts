import { describe, expect, it } from 'vitest';
import { activeSeconds, coverageCandidates, finishSession, pauseSession, resumeSession } from '../shared/domain/sessions';
import { streak, weekStats } from '../shared/domain/metrics';
import { sessionSchema } from '../shared/schema';
import { care, clock, dayState, ev, MONDAY, session, snap } from './fixtures';
import { addDays } from '../shared/time';

const T0 = Date.parse('2026-10-26T18:00:00Z');

describe('timer', () => {
  it('derives time from timestamps, so a locked phone loses nothing', () => {
    const s = sessionSchema.parse({ id: 's', updated_at: 1, type: 'create', status: 'running', started_at: T0 });
    // phone locked for 47 minutes — no ticks happen, time is still correct
    expect(activeSeconds(s, T0 + 47 * 60e3)).toBe(47 * 60);
  });

  it('subtracts pauses, including an open one', () => {
    let s = sessionSchema.parse({ id: 's', updated_at: 1, type: 'create', status: 'running', started_at: T0 });
    s = pauseSession(s, T0 + 10 * 60e3);
    expect(activeSeconds(s, T0 + 40 * 60e3)).toBe(600);
    s = resumeSession(s, T0 + 40 * 60e3);
    s = finishSession(s, T0 + 70 * 60e3);
    expect(s.active_seconds).toBe(40 * 60);
    expect(s.status).toBe('finished');
  });

  it('finishing twice does not change the recorded time', () => {
    let s = sessionSchema.parse({ id: 's', updated_at: 1, type: 'create', status: 'running', started_at: T0 });
    s = finishSession(s, T0 + 60 * 60e3);
    const again = finishSession(s, T0 + 120 * 60e3);
    expect(again.active_seconds).toBe(3600);
    expect(again.ended_at).toBe(s.ended_at);
  });
});

describe('no double counting', () => {
  it('a 5-hour spontaneous demo session covers a similar planned item without adding time twice', () => {
    const planned = ev({ kind: 'music', title: 'Sesja twórcza', date: MONDAY, start_min: 1200, end_min: 1290 });
    const spont = session({ date: MONDAY, startH: 12, minutes: 300, outcome: 'demo' });
    const s = snap({ events: [planned], sessions: [spont] });
    const cands = coverageCandidates(spont, s.events, 'UTC');
    expect(cands[0].event.id).toBe(planned.id);
    expect(cands[0].suggested).toBe(true);
    // user accepts → event marked covered
    s.events = [{ ...planned, status: 'covered', session_id: spont.id }];
    const w = weekStats(s, MONDAY, MONDAY);
    expect(w.minutes).toBe(300);
    expect(w.sessionCount).toBe(1);
    expect(w.fulfilled).toBe(1);
    expect(w.outcomes.demo).toBe(1);
  });

  it('a short session does not cover a whole week of plans', () => {
    const evs = [0, 1, 2].map((i) => ev({ kind: 'music', date: addDays(MONDAY, i), start_min: 1200, end_min: 1290 }));
    const short = session({ date: MONDAY, minutes: 40 });
    const c = coverageCandidates(short, evs, 'UTC');
    expect(c.filter((x) => x.suggested)).toHaveLength(0);
  });

  it('the same session row stored twice is one session', () => {
    const one = session({ date: MONDAY, minutes: 60 });
    const byId = new Map([[one.id, one], [one.id, { ...one }]]);
    const w = weekStats(snap({ sessions: [...byId.values()] }), MONDAY, MONDAY);
    expect(w.sessionCount).toBe(1);
    expect(w.minutes).toBe(60);
  });
});

describe('regularity', () => {
  it('a sick week is protected and does not break the streak', () => {
    const p = snap().profile!;
    const prev = addDays(MONDAY, -7);
    const prev2 = addDays(MONDAY, -14);
    const sessions = [0, 1, 2, 3].map((i) => session({ date: addDays(prev2, i), minutes: 60 }));
    const sick = care({ date: prev, signal: 'sick', until: addDays(prev, 6) });
    const s = snap({ profile: { ...p, start_date: addDays(prev2, 0) }, sessions, care: [sick] });
    const st = streak(s, addDays(MONDAY, 1));
    expect(st.history.find((h) => h.weekStart === prev)?.state).toBe('protected');
    expect(st.current).toBe(1);
  });

  it('one missed afternoon does not reset regularity; target is weekly', () => {
    const sessions = [0, 2, 4, 5].map((i) => session({ date: addDays(MONDAY, i), minutes: 45 }));
    const w = weekStats(snap({ sessions }), MONDAY, addDays(MONDAY, 6));
    expect(w.state).toBe('kept');
  });

  it('days off reduce the target proportionally', () => {
    const s = snap({ day_states: [dayState(addDays(MONDAY, 5), 'off'), dayState(addDays(MONDAY, 6), 'off')] });
    const w = weekStats(s, MONDAY, MONDAY);
    expect(w.adjustedTarget).toBe(Math.round((4 * 5) / 7));
  });

  it('sessions under 10 minutes are kept but do not count', () => {
    const w = weekStats(snap({ sessions: [session({ date: MONDAY, minutes: 5 })] }), MONDAY, MONDAY);
    expect(w.sessionCount).toBe(0);
  });

  it('clock fixture is a Monday', () => {
    expect(clock().today).toBe('2026-10-26');
  });
});
