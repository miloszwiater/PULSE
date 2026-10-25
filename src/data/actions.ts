import {
  attemptSchema, careSchema, dayStateSchema, sessionSchema,
  type CareSignal, type DayStatus, type EntityName, type EntityRows, type Outcome, type PEvent, type Proposal,
  type Session, type SessionType, type SkillCategory, type ProjectStage,
} from '../../shared/schema';
import { newId } from '../../shared/domain/snapshot';
import { finishSession, linkedEventStatus, pauseSession, resumeSession } from '../../shared/domain/sessions';
import { applyWrites, rejectWrites, revertWrites } from '../../shared/domain/proposals';
import { EXERCISE_BY_ID } from '../../shared/catalog/exercises';
import { addDays, zoned } from '../../shared/time';
import { commit, useStore, type Write } from './store';
import { clockNow, tzOf } from './clock';
import { toast } from '../ui/toast';

const rows = () => useStore.getState().rows;

export function activeSession(): Session | null {
  return Object.values(rows().sessions).find((s) => s.deleted_at == null && (s.status === 'running' || s.status === 'paused')) ?? null;
}

export function startSession(opts: { type?: SessionType; event?: PEvent | null; exercise_id?: string | null; project_id?: string | null; category?: SkillCategory | null; title?: string } = {}): Session {
  const existing = activeSession();
  if (existing) return existing;
  const ex = opts.exercise_id ? EXERCISE_BY_ID[opts.exercise_id] : opts.event?.exercise_id ? EXERCISE_BY_ID[opts.event.exercise_id] : undefined;
  const now = Date.now();
  const s = sessionSchema.parse({
    id: newId('se'),
    updated_at: now,
    type: opts.type ?? (ex ? 'training' : 'create'),
    title: opts.title ?? opts.event?.title ?? ex?.title ?? '',
    status: 'running',
    started_at: now,
    event_id: opts.event?.id ?? null,
    project_id: opts.project_id ?? opts.event?.project_id ?? null,
    exercise_id: ex?.id ?? null,
    category: opts.category ?? ex?.category ?? opts.event?.category ?? null,
  });
  commit([{ entity: 'sessions', row: s }]);
  return s;
}

export function updateSession(s: Session, patch: Partial<Session>) {
  commit([{ entity: 'sessions', row: { ...s, ...patch } }]);
}
export function pause(s: Session) { commit([{ entity: 'sessions', row: pauseSession(s, Date.now()) }]); }
export function resume(s: Session) { commit([{ entity: 'sessions', row: resumeSession(s, Date.now()) }]); }

export function discardSession(s: Session) {
  commit([{ entity: 'sessions', row: { ...s, status: 'discarded', ended_at: Date.now() } }]);
}

export interface FinishInput {
  outcome: Outcome;
  note: string;
  energy: number | null;
  coverIds: string[];
  attempt?: { completed: boolean; difficulty: 'easy' | 'right' | 'hard'; feedback: string } | null;
  projectStage?: ProjectStage | null;
  endAt?: number;
}

/**
 * Finishing is a single atomic commit of idempotent puts keyed by stable ids
 * (session id, attempt `at_<session>`), so a double tap or a retry can never
 * create a second session or double the time.
 */
export function finish(s: Session, input: FinishInput): Session {
  const now = input.endAt ?? Date.now();
  const done = finishSession(s, now, { outcome: input.outcome, outcome_note: input.note, energy_after: input.energy });
  const writes: Write[] = [{ entity: 'sessions', row: done }];
  const r = rows();
  const tz = tzOf();
  const date = zoned(done.started_at, tz).date;
  if (done.event_id) {
    const ev = r.events[done.event_id];
    if (ev && ev.deleted_at == null) writes.push({ entity: 'events', row: { ...ev, status: linkedEventStatus(ev, done), session_id: done.id } });
  }
  for (const id of input.coverIds) {
    const ev = r.events[id];
    if (ev && ev.status === 'planned') writes.push({ entity: 'events', row: { ...ev, status: 'covered', session_id: done.id } });
  }
  if (done.exercise_id && input.attempt) {
    const ex = EXERCISE_BY_ID[done.exercise_id];
    if (ex) {
      writes.push({ entity: 'attempts', row: attemptSchema.parse({
        id: `at_${done.id}`, updated_at: now, exercise_id: ex.id, category: ex.category, level: ex.level,
        session_id: done.id, date, completed: input.attempt.completed, difficulty: input.attempt.difficulty, feedback: input.attempt.feedback,
      }) });
    }
  }
  if (done.project_id) {
    const p = r.projects[done.project_id];
    if (p) writes.push({ entity: 'projects', row: { ...p, last_worked_at: now, stage: input.projectStage ?? p.stage } });
  }
  commit(writes);
  return done;
}

export function logManualSession(input: { date: string; startMin: number; minutes: number; type: SessionType; outcome: Outcome; note: string; category?: SkillCategory | null; project_id?: string | null; event?: PEvent | null }) {
  // Floating local time → instant: interpret in the profile timezone via offset of that day.
  const guess = Date.parse(`${input.date}T00:00:00Z`) + input.startMin * 60e3;
  const z = zoned(guess, tzOf());
  const offsetMin = (Date.parse(`${z.date}T00:00:00Z`) + z.minutes * 60e3 - guess) / 60e3;
  const start = guess - offsetMin * 60e3;
  const id = input.event ? `se_m_${input.event.id}` : newId('se');
  const s = sessionSchema.parse({
    id, updated_at: Date.now(), type: input.type, status: 'finished', source: 'manual',
    title: input.event?.title ?? '', started_at: start, ended_at: start + input.minutes * 60e3,
    active_seconds: input.minutes * 60, outcome: input.outcome, outcome_note: input.note,
    category: input.category ?? input.event?.category ?? null, project_id: input.project_id ?? input.event?.project_id ?? null,
    exercise_id: input.event?.exercise_id ?? null, event_id: input.event?.id ?? null,
  });
  const writes: Write[] = [{ entity: 'sessions', row: s }];
  if (input.event) writes.push({ entity: 'events', row: { ...input.event, status: 'done', session_id: s.id } });
  commit(writes);
  return s;
}

/** Status change with an undo toast. */
export function setEventStatus(ev: PEvent, status: PEvent['status'], label?: string) {
  const prev = { ...ev };
  commit([{ entity: 'events', row: { ...ev, status } }]);
  toast(label ?? 'Zapisano.', 'ok', { label: 'Cofnij', run: () => commit([{ entity: 'events', row: { ...prev, updated_at: Date.now() } }]) });
}

export function applyProposal(p: Proposal) {
  const writes = applyWrites(p, Date.now());
  commit(writes.map((w) => (w.action === 'delete' ? { entity: w.entity, deleteId: w.id } : { entity: w.entity, row: w.row as never })));
  toast('Zmiany zastosowane.', 'ok', { label: 'Cofnij', run: () => revertProposal({ ...p, status: 'applied', decided_at: Date.now() - 1 }) });
}

export function rejectProposal(p: Proposal) {
  commit(rejectWrites(p, Date.now()).map((w) => ({ entity: w.entity, row: w.row as never })));
}

export function revertProposal(p: Proposal) {
  const r = rows();
  const plan = revertWrites(p, Date.now(), (e: EntityName, id: string) => (r[e] as Record<string, Record<string, unknown>>)[id]);
  commit(plan.writes.map((w) => (w.action === 'delete' ? { entity: w.entity, deleteId: w.id } : { entity: w.entity, row: w.row as never })));
  toast(plan.drifted.length ? `Cofnięto. Uwaga: ${plan.drifted.length} element(y) edytowano po zastosowaniu — przywrócono stan sprzed propozycji.` : 'Cofnięto zmiany.', 'ok');
}

export function checkIn(signal: CareSignal, opts: { days?: number; note?: string } = {}) {
  const c = clockNow();
  const row = careSchema.parse({
    id: newId('ca'), updated_at: Date.now(), at: Date.now(), date: c.today, signal,
    until: signal === 'sick' && opts.days ? addDays(c.today, opts.days - 1) : null, note: opts.note ?? '',
  });
  commit([{ entity: 'care', row }]);
  return row;
}

export function setDayStatus(date: string, status: DayStatus, note = '') {
  const cur = rows().day_states[date];
  if (status === 'normal' && cur) { commit([{ entity: 'day_states', deleteId: date }]); return; }
  commit([{ entity: 'day_states', row: dayStateSchema.parse({ id: date, updated_at: Date.now(), date, status, note }) }]);
}

export function patchProfile(patch: Partial<EntityRows['profile']>) {
  const p = rows().profile.me;
  if (!p) return;
  commit([{ entity: 'profile', row: { ...p, ...patch } }]);
}

export function putRow<K extends EntityName>(entity: K, row: EntityRows[K]) {
  commit([{ entity, row } as Write]);
}
