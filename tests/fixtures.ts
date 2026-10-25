import {
  profileSchema, eventSchema, routineSchema, sessionSchema, careSchema, dayStateSchema,
  type PEvent, type Profile, type Routine, type Session, type CareCheckin, type DayState,
} from '../shared/schema';
import { emptySnapshot, type Clock, type Snapshot } from '../shared/domain/snapshot';

let n = 0;
const nid = (p: string) => `${p}_${++n}`;

export function profile(over: Partial<Profile> = {}): Profile {
  return profileSchema.parse({
    id: 'me', updated_at: 1, timezone: 'UTC', start_date: '2026-10-01', onboarding_done: true,
    weekly_session_target: 4, session_default_min: 90, wake_min: 420, bed_min: 1380, ...over,
  });
}

export function ev(over: Partial<PEvent> & Pick<PEvent, 'date' | 'start_min' | 'end_min'>): PEvent {
  return eventSchema.parse({ id: nid('ev'), updated_at: 1, kind: 'music', title: 'Sesja', ...over });
}

export function routine(over: Partial<Routine>): Routine {
  return routineSchema.parse({ id: nid('rt'), updated_at: 1, kind: 'work', title: 'Praca', weekdays: [0, 1, 2, 3, 4], start_min: 480, end_min: 960, ...over });
}

/** Session in UTC so dates are deterministic. */
export function session(over: Partial<Session> & { date: string; startH?: number; minutes: number }): Session {
  const start = Date.parse(`${over.date}T00:00:00Z`) + (over.startH ?? 18) * 3600e3;
  const { date: _d, startH: _s, minutes, ...rest } = over;
  return sessionSchema.parse({
    id: nid('se'), updated_at: 1, type: 'create', status: 'finished', started_at: start,
    ended_at: start + minutes * 60e3, active_seconds: minutes * 60, ...rest,
  });
}

export function care(over: Partial<CareCheckin> & Pick<CareCheckin, 'date' | 'signal'>): CareCheckin {
  return careSchema.parse({ id: nid('ca'), updated_at: 1, at: Date.parse(`${over.date}T08:00:00Z`), ...over });
}

export function dayState(date: string, status: DayState['status']): DayState {
  return dayStateSchema.parse({ id: date, updated_at: 1, date, status });
}

export function snap(over: Partial<Snapshot> = {}): Snapshot {
  return { ...emptySnapshot(), profile: profile(), ...over };
}

/** 2026-10-26 is a Monday. */
export const MONDAY = '2026-10-26';
export function clock(today = MONDAY, nowMin = 420): Clock {
  return { today, nowMin, nowMs: Date.parse(`${today}T00:00:00Z`) + nowMin * 60e3 };
}
