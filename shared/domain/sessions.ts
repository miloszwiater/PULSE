import type { PEvent, Session, SessionType, SkillCategory } from '../schema';
import { zoned, weekStart, daysBetween } from '../time';

/** A finished session shorter than this is stored but does not count as a session for regularity. */
export const MIN_COUNTED_SECONDS = 10 * 60;
/** Hard cap: a single session can never account for more than 16 h of work. */
export const MAX_SESSION_SECONDS = 16 * 3600;

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  create: 'Tworzenie muzyki',
  record: 'Nagrywanie',
  write: 'Pisanie do beatu',
  flow: 'Flow',
  inspiration: 'Inspiracja',
  experiment: 'Eksperyment',
  production: 'Produkcja',
  training: 'Trening',
  other: 'Inne',
};

/**
 * Active time is derived purely from timestamps, so a locked phone or a
 * killed tab never loses or invents time: elapsed wall time minus pauses.
 */
export function activeSeconds(s: Pick<Session, 'started_at' | 'ended_at' | 'pauses'>, nowMs: number): number {
  const end = s.ended_at ?? nowMs;
  let paused = 0;
  for (const [ps, pe] of s.pauses) {
    const from = Math.max(ps, s.started_at);
    const to = Math.min(pe ?? end, end);
    if (to > from) paused += to - from;
  }
  const secs = Math.floor((end - s.started_at - paused) / 1000);
  return Math.max(0, Math.min(MAX_SESSION_SECONDS, secs));
}

export function isPaused(s: Session): boolean {
  const last = s.pauses[s.pauses.length - 1];
  return !!last && last[1] == null;
}

export function pauseSession(s: Session, nowMs: number): Session {
  if (s.status !== 'running' || isPaused(s)) return s;
  return { ...s, status: 'paused', pauses: [...s.pauses, [nowMs, null]], updated_at: nowMs };
}

export function resumeSession(s: Session, nowMs: number): Session {
  if (!isPaused(s)) return s;
  const pauses = s.pauses.map((p, i) => (i === s.pauses.length - 1 ? ([p[0], nowMs] as [number, number]) : p));
  return { ...s, status: 'running', pauses, updated_at: nowMs };
}

export function finishSession(s: Session, nowMs: number, patch: Partial<Session> = {}): Session {
  if (s.status === 'finished') return { ...s, ...patch, updated_at: nowMs };
  const closed = s.pauses.map((p) => (p[1] == null ? ([p[0], nowMs] as [number, number]) : p));
  const ended = { ...s, pauses: closed, ended_at: nowMs };
  return { ...ended, ...patch, status: 'finished', active_seconds: activeSeconds(ended, nowMs), updated_at: nowMs };
}

export function sessionDate(s: Session, tz: string): string {
  return zoned(s.started_at, tz).date;
}

export function countsAsSession(s: Session): boolean {
  return s.deleted_at == null && s.status === 'finished' && s.active_seconds >= MIN_COUNTED_SECONDS;
}

const CREATIVE_TYPES: SessionType[] = ['create', 'record', 'write', 'flow', 'inspiration', 'experiment', 'production'];

export interface CoverageCandidate {
  event: PEvent;
  score: number;
  /** Pre-selected in the finish sheet. */
  suggested: boolean;
  reason: string;
}

/**
 * Planned music/training events in the same week that this session can
 * fulfil. A session covers at most one event's worth of commitment per
 * hour of real work, so a 30 min session never "covers" a whole week.
 */
export function coverageCandidates(session: Session, events: PEvent[], tz: string): CoverageCandidate[] {
  const sDate = sessionDate(session, tz);
  const wk = weekStart(sDate);
  const minutes = session.active_seconds / 60;
  const out: CoverageCandidate[] = [];
  for (const e of events) {
    if (e.deleted_at != null || e.status !== 'planned') continue;
    if (e.kind !== 'music' && e.kind !== 'training') continue;
    if (weekStart(e.date) !== wk) continue;
    if (e.id === session.event_id) continue;
    const dayDiff = daysBetween(sDate, e.date);
    if (dayDiff < -6 || dayDiff > 6) continue;
    let score = 0;
    const reasons: string[] = [];
    if (dayDiff === 0) { score += 3; reasons.push('ten sam dzień'); }
    else if (dayDiff > 0) { score += 1; reasons.push('zaplanowane później w tym tygodniu'); }
    else { score += 0.5; reasons.push('wcześniej w tym tygodniu, niewykonane'); }
    if (session.exercise_id && e.exercise_id === session.exercise_id) { score += 3; reasons.push('to samo ćwiczenie'); }
    else if (session.category && e.category === session.category) { score += 2; reasons.push('ta sama kategoria'); }
    else if (e.kind === 'music' && CREATIVE_TYPES.includes(session.type)) { score += 1.5; reasons.push('sesja twórcza'); }
    else if (e.kind === 'training' && !e.category) { score += 1; }
    if (session.project_id && e.project_id === session.project_id) { score += 2; reasons.push('ten sam projekt'); }
    const planned = e.end_min - e.start_min;
    const enough = minutes >= planned * 0.6;
    if (!enough) reasons.push(`sesja krótsza niż plan (${Math.round(minutes)} z ${planned} min)`);
    out.push({ event: e, score, suggested: false, reason: reasons.join(', ') });
  }
  out.sort((a, b) => b.score - a.score);
  // Budget: one covered commitment per started 60 min of real work.
  let budget = Math.max(0, Math.floor(minutes / 60));
  for (const c of out) {
    const planned = c.event.end_min - c.event.start_min;
    if (budget <= 0) break;
    if (c.score >= 3 && minutes >= planned * 0.6) {
      c.suggested = true;
      budget -= Math.max(1, Math.round(planned / 60));
    }
  }
  return out.filter((c) => c.score >= 1.5);
}

/** Status for an event explicitly linked to a finished session. */
export function linkedEventStatus(event: PEvent, session: Session): 'done' | 'partial' {
  const planned = Math.max(1, event.end_min - event.start_min);
  return session.active_seconds / 60 >= planned * 0.5 ? 'done' : 'partial';
}

export function categoryOfSession(s: Session): SkillCategory | null {
  if (s.category) return s.category;
  switch (s.type) {
    case 'write': return 'songwriting';
    case 'flow': return 'flow';
    case 'production': return 'production';
    default: return null;
  }
}
