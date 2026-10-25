import type {
  Attempt, Book, CareCheckin, DayState, Goal, Milestone, PEvent, Profile, Project, PromoTask,
  Routine, RoutineException, Session, SkillLevel, Proposal, Workflow, Learning, Song,
} from '../schema';

/** Read-only view over the user's data that every domain function consumes. */
export interface Snapshot {
  profile: Profile | null;
  routines: Routine[];
  routine_exceptions: RoutineException[];
  day_states: DayState[];
  events: PEvent[];
  sessions: Session[];
  attempts: Attempt[];
  skill_levels: SkillLevel[];
  projects: Project[];
  goals: Goal[];
  milestones: Milestone[];
  books: Book[];
  promo_tasks: PromoTask[];
  care: CareCheckin[];
  proposals: Proposal[];
  workflows: Workflow[];
  learning: Learning[];
  songs: Song[];
}

export const emptySnapshot = (): Snapshot => ({
  profile: null, routines: [], routine_exceptions: [], day_states: [], events: [], sessions: [],
  attempts: [], skill_levels: [], projects: [], goals: [], milestones: [], books: [], promo_tasks: [],
  care: [], proposals: [], workflows: [], learning: [], songs: [],
});

export interface Clock {
  today: string;
  /** minute of day, local to the profile timezone */
  nowMin: number;
  nowMs: number;
}

export const alive = <T extends { deleted_at: number | null }>(rows: T[]): T[] => rows.filter((r) => r.deleted_at == null);

export function newId(prefix = ''): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 18);
  return prefix ? `${prefix}_${s}` : s;
}
