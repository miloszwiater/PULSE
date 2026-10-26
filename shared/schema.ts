/**
 * Single source of truth for every synced entity.
 * The client writes rows through the outbox, the worker validates them with
 * these schemas and maps them onto D1 tables of the same name.
 */
import { z } from 'zod';

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_:.-]+$/);
const text = (max = 2000) => z.string().max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const minute = z.number().int().min(0).max(2160); // up to 36:00 for overnight shifts
const ms = z.number().int().nonnegative();
const strList = z.array(text(200)).max(50);

const base = {
  id,
  updated_at: ms,
  deleted_at: ms.nullable().default(null),
};

export const EVENT_KINDS = [
  'work', 'commute', 'music', 'training', 'reading', 'promo',
  'private', 'relationship', 'sport', 'rest', 'other',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Kinds the planner treats as development commitments (counted in discipline). */
export const COMMITMENT_KINDS: EventKind[] = ['music', 'training', 'reading', 'promo'];
/** Kinds that represent real obligations / life and block planning. */
export const BLOCKING_KINDS: EventKind[] = ['work', 'commute', 'private', 'relationship', 'sport', 'rest', 'other'];

export const EVENT_STATUSES = [
  'planned', 'done', 'partial', 'skipped', 'moved', 'excused', 'covered', 'cancelled',
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const SESSION_TYPES = [
  'create', 'record', 'write', 'flow', 'inspiration', 'experiment', 'production', 'training', 'other',
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const OUTCOMES = [
  'none', 'idea', 'verses', 'hook', 'demo', 'recording', 'mix', 'finished', 'exercise', 'notes',
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const SKILL_CATEGORIES = ['songwriting', 'flow', 'melody', 'production', 'analysis'] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const DAY_STATUSES = ['normal', 'off', 'sick', 'vacation', 'overloaded'] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

export const PROJECT_STAGES = ['idea', 'sketch', 'demo', 'recording', 'mix', 'ready', 'released'] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PROJECT_KINDS = ['single', 'ep', 'album', 'collection'] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

/** `planned` is the stored value behind "Chcę przeczytać" (it was "Polecona" before the library rebuild). */
export const BOOK_STATUSES = ['suggested', 'planned', 'bought', 'reading', 'read', 'paused', 'dropped'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

export const CARE_SIGNALS = ['energized', 'low', 'sick', 'overloaded'] as const;
export type CareSignal = (typeof CARE_SIGNALS)[number];

export const GOAL_AREAS = ['music', 'skill', 'release', 'promo', 'reading', 'finance', 'life', 'other'] as const;

export const profileSchema = z.object({
  ...base,
  display_name: text(80).default(''),
  artist_name: text(80).default(''),
  genres: strList.default([]),
  inspirations: strList.default([]),
  strengths: strList.default([]),
  weaknesses: strList.default([]),
  goals_text: text(4000).default(''),
  style_text: text(4000).default(''),
  techniques: strList.default([]),
  vision: text(1000).default(''),
  values: strList.default([]),
  scene: z.enum(['auto', 'night', 'rain', 'photo']).default('auto'),
  /** Free description of the music the person makes (context for the companion and academy). */
  music_style: text(1000).default(''),
  /** Apps the person finds distracting — a checklist for the iOS Screen Time setup, PULSE cannot block them itself. */
  focus_apps: strList.default([]),
  /** Name of the iOS Shortcut started together with a focus session (empty = off). */
  focus_shortcut: text(120).default(''),
  /** Recurring distraction-free blocks of the day (mirrored by the person in iOS Screen Time / Focus). */
  focus_blocks: z.array(z.object({
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    start_min: minute,
    end_min: minute,
    label: text(60).default(''),
  })).max(12).default([]),
  /** Optional learning blocks the planner may propose per week (0 = never). */
  learning_per_week: z.number().int().min(0).max(5).default(1),
  timezone: text(64).default('Europe/Warsaw'),
  wake_min: minute.default(450),
  bed_min: minute.default(1410),
  weekly_session_target: z.number().int().min(0).max(21).default(4),
  weekly_minutes_target: z.number().int().min(0).max(6000).default(360),
  session_default_min: z.number().int().min(15).max(480).default(90),
  focus_categories: z.array(z.enum(SKILL_CATEGORIES)).max(5).default([]),
  start_date: date.nullable().default(null),
  onboarding_done: z.boolean().default(false),
  mentor_text_consent: z.boolean().default(false),
  reminders: z.object({
    enabled: z.boolean(),
    morning_brief: z.boolean(),
    session_start: z.boolean(),
    weekly_review: z.boolean(),
    quiet_during_work: z.boolean(),
  }).default({ enabled: false, morning_brief: true, session_start: true, weekly_review: true, quiet_during_work: true }),
});

export const routineSchema = z.object({
  ...base,
  kind: z.enum(EVENT_KINDS),
  title: text(120),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7), // 0 = Monday
  start_min: minute,
  end_min: minute,
  valid_from: date.nullable().default(null),
  valid_to: date.nullable().default(null),
  active: z.boolean().default(true),
});

export const routineExceptionSchema = z.object({
  ...base,
  routine_id: id,
  date,
});

export const dayStateSchema = z.object({
  ...base, // id = date
  date,
  status: z.enum(DAY_STATUSES),
  note: text(500).default(''),
});

export const eventSchema = z.object({
  ...base,
  kind: z.enum(EVENT_KINDS),
  title: text(160),
  date,
  start_min: minute,
  end_min: minute,
  status: z.enum(EVENT_STATUSES).default('planned'),
  priority: z.number().int().min(1).max(3).default(2), // 1 = high
  flexible: z.boolean().default(true),
  source: z.enum(['user', 'planner', 'mentor', 'routine']).default('user'),
  category: z.enum(SKILL_CATEGORIES).nullable().default(null),
  exercise_id: text(64).nullable().default(null),
  /** Academy lesson this block is meant for (optional learning). */
  lesson_key: text(64).nullable().default(null),
  project_id: id.nullable().default(null),
  book_id: id.nullable().default(null),
  goal_id: id.nullable().default(null),
  session_id: id.nullable().default(null), // session that fulfilled / covered it
  moved_to: id.nullable().default(null),
  proposal_id: id.nullable().default(null),
  notes: text(2000).default(''),
});

export const sessionSchema = z.object({
  ...base,
  type: z.enum(SESSION_TYPES),
  title: text(160).default(''),
  status: z.enum(['running', 'paused', 'finished', 'discarded']),
  started_at: ms,
  ended_at: ms.nullable().default(null),
  /** Closed or open pause intervals in epoch ms. */
  pauses: z.array(z.tuple([ms, ms.nullable()])).max(200).default([]),
  active_seconds: z.number().int().min(0).max(86400).default(0),
  source: z.enum(['timer', 'manual']).default('timer'),
  category: z.enum(SKILL_CATEGORIES).nullable().default(null),
  event_id: id.nullable().default(null),
  project_id: id.nullable().default(null),
  exercise_id: text(64).nullable().default(null),
  outcome: z.enum(OUTCOMES).default('none'),
  outcome_note: text(2000).default(''),
  energy_after: z.number().int().min(1).max(5).nullable().default(null),
  focus_mode: z.boolean().default(false),
  workflow_id: id.nullable().default(null),
  /** Intended length chosen at start; null = open-ended. Never enforced. */
  target_minutes: z.number().int().min(5).max(720).nullable().default(null),
});

/** A named, reusable way of starting a Creative Workflow session. */
export const workflowSchema = z.object({
  ...base,
  name: text(60),
  minutes: z.number().int().min(5).max(720).nullable().default(null),
  focus: z.boolean().default(false),
  tone: z.number().int().min(0).max(7).default(0),
  intention: text(300).default(''),
  position: z.number().int().default(0),
  last_used_at: ms.nullable().default(null),
});

export const LEARNING_STATUSES = ['active', 'paused', 'done'] as const;

/** Progress in the Music Academy: one row per started path (kind=path) or opened lesson (kind=lesson); id = catalog key. */
export const learningSchema = z.object({
  ...base,
  kind: z.enum(['path', 'lesson']),
  path_key: text(64),
  status: z.enum(LEARNING_STATUSES),
  started_at: ms.nullable().default(null),
  done_at: ms.nullable().default(null),
  last_opened_at: ms.nullable().default(null),
  revisits: z.number().int().min(0).max(10000).default(0),
  note: text(4000).default(''),
});

export const songSchema = z.object({
  ...base,
  project_id: id,
  title: text(160),
  lyrics: text(20000).default(''),
  notes: text(4000).default(''),
  position: z.number().int().default(0),
  done: z.boolean().default(false),
});

export const attemptSchema = z.object({
  ...base,
  exercise_id: text(64),
  category: z.enum(SKILL_CATEGORIES),
  level: z.number().int().min(1).max(4),
  session_id: id.nullable().default(null),
  date,
  completed: z.boolean(),
  difficulty: z.enum(['easy', 'right', 'hard']),
  feedback: text(2000).default(''),
});

export const skillLevelSchema = z.object({
  ...base, // id = category
  category: z.enum(SKILL_CATEGORIES),
  level: z.number().int().min(1).max(4),
  reason: text(300).default(''),
});

export const projectSchema = z.object({
  ...base,
  title: text(160),
  working_title: text(160).default(''),
  description: text(2000).default(''),
  stage: z.enum(PROJECT_STAGES).default('idea'),
  notes: text(8000).default(''),
  inspirations: text(2000).default(''),
  link: text(500).default(''),
  release_date: date.nullable().default(null),
  last_worked_at: ms.nullable().default(null),
  archived: z.boolean().default(false),
  kind: z.enum(PROJECT_KINDS).default('single'),
  /** Small JPEG data URL (client-compressed), synced with the row. */
  cover_data: z.string().max(300000).regex(/^(data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)?$/).default(''),
  tone: z.number().int().min(0).max(7).default(0),
});

export const goalSchema = z.object({
  ...base,
  title: text(200),
  area: z.enum(GOAL_AREAS),
  period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).default('custom'),
  metric: z.enum(['manual', 'sessions', 'minutes', 'demos', 'finished_tracks', 'books', 'promo_tasks']).default('manual'),
  target: z.number().min(0).max(100000).default(1),
  manual_progress: z.number().min(0).max(100000).default(0),
  start_date: date.nullable().default(null),
  due_date: date.nullable().default(null),
  status: z.enum(['active', 'done', 'paused', 'dropped']).default('active'),
  milestone_id: id.nullable().default(null),
  notes: text(2000).default(''),
});

export const milestoneSchema = z.object({
  ...base,
  phase: z.number().int().min(1).max(4),
  title: text(200),
  description: text(2000).default(''),
  status: z.enum(['open', 'in_progress', 'done', 'skipped']).default('open'),
  order: z.number().int().default(0),
  template_key: text(64).nullable().default(null),
  done_at: ms.nullable().default(null),
});

export const bookSchema = z.object({
  ...base,
  title: text(200),
  author: text(200).default(''),
  topic: text(200).default(''),
  learning_goal: text(1000).default(''),
  status: z.enum(BOOK_STATUSES).default('planned'),
  due_date: date.nullable().default(null),
  progress: z.number().int().min(0).max(100).nullable().default(null),
  pages: z.number().int().min(0).max(5000).nullable().default(null),
  notes: text(8000).default(''),
  practice: text(2000).default(''),
  catalog_key: text(64).nullable().default(null),
  reason: text(1000).default(''),
  status_changed_at: ms.nullable().default(null),
  started_at: ms.nullable().default(null),
  finished_at: ms.nullable().default(null),
  /** Feedback asked once after finishing; never required. */
  rating: z.number().int().min(1).max(5).nullable().default(null),
  clarity: z.enum(['clear', 'partly', 'hard']).nullable().default(null),
  direction: z.enum(['more', 'different', 'unsure']).nullable().default(null),
});

export const promoTaskSchema = z.object({
  ...base,
  lesson_key: text(64).nullable().default(null),
  title: text(200),
  channel: text(60).default(''),
  status: z.enum(['todo', 'doing', 'done', 'skipped']).default('todo'),
  due_date: date.nullable().default(null),
  project_id: id.nullable().default(null),
  notes: text(4000).default(''),
  result: text(2000).default(''),
  done_at: ms.nullable().default(null),
});

export const careSchema = z.object({
  ...base,
  at: ms,
  date,
  signal: z.enum(CARE_SIGNALS),
  until: date.nullable().default(null),
  note: text(1000).default(''),
});

export const mentorMessageSchema = z.object({
  ...base,
  role: z.enum(['user', 'assistant']),
  content: text(12000),
  at: ms,
  proposal_id: id.nullable().default(null),
  cards: z.array(z.object({
    type: z.enum(['exercise', 'book', 'proposal', 'lesson', 'action']),
    id: text(64),
    why: text(1000).optional(),
    title: text(200).optional(),
  })).max(10).default([]),
});

export const proposalSchema = z.object({
  ...base,
  source: z.enum(['planner', 'mentor', 'conflict']),
  title: text(200),
  rationale: text(3000).default(''),
  /** Serialized list of row puts to apply; see shared/proposals.ts */
  changes: z.array(z.object({
    entity: z.string().max(40),
    before: z.record(z.string(), z.unknown()).nullable(),
    after: z.record(z.string(), z.unknown()),
    label: text(300),
  })).max(60),
  status: z.enum(['pending', 'applied', 'rejected', 'reverted']).default('pending'),
  decided_at: ms.nullable().default(null),
});

export const ENTITIES = {
  profile: profileSchema,
  routines: routineSchema,
  routine_exceptions: routineExceptionSchema,
  day_states: dayStateSchema,
  events: eventSchema,
  sessions: sessionSchema,
  attempts: attemptSchema,
  skill_levels: skillLevelSchema,
  projects: projectSchema,
  goals: goalSchema,
  milestones: milestoneSchema,
  books: bookSchema,
  promo_tasks: promoTaskSchema,
  care: careSchema,
  mentor_messages: mentorMessageSchema,
  proposals: proposalSchema,
  workflows: workflowSchema,
  learning: learningSchema,
  songs: songSchema,
} as const;

export type EntityName = keyof typeof ENTITIES;
export const ENTITY_NAMES = Object.keys(ENTITIES) as EntityName[];

export type Profile = z.infer<typeof profileSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type RoutineException = z.infer<typeof routineExceptionSchema>;
export type DayState = z.infer<typeof dayStateSchema>;
export type PEvent = z.infer<typeof eventSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Attempt = z.infer<typeof attemptSchema>;
export type SkillLevel = z.infer<typeof skillLevelSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Book = z.infer<typeof bookSchema>;
export type PromoTask = z.infer<typeof promoTaskSchema>;
export type CareCheckin = z.infer<typeof careSchema>;
export type MentorMessage = z.infer<typeof mentorMessageSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Learning = z.infer<typeof learningSchema>;
export type Song = z.infer<typeof songSchema>;

export interface EntityRows {
  profile: Profile;
  routines: Routine;
  routine_exceptions: RoutineException;
  day_states: DayState;
  events: PEvent;
  sessions: Session;
  attempts: Attempt;
  skill_levels: SkillLevel;
  projects: Project;
  goals: Goal;
  milestones: Milestone;
  books: Book;
  promo_tasks: PromoTask;
  care: CareCheckin;
  mentor_messages: MentorMessage;
  proposals: Proposal;
  workflows: Workflow;
  learning: Learning;
  songs: Song;
}

/** Columns stored as JSON text in D1. */
export const JSON_COLUMNS: Partial<Record<EntityName, string[]>> = {
  profile: ['genres', 'inspirations', 'strengths', 'weaknesses', 'focus_categories', 'reminders', 'techniques', 'values', 'focus_apps', 'focus_blocks'],
  routines: ['weekdays'],
  sessions: ['pauses'],
  proposals: ['changes'],
  mentor_messages: ['cards'],
};

export const BOOL_COLUMNS: Partial<Record<EntityName, string[]>> = {
  profile: ['onboarding_done', 'mentor_text_consent'],
  routines: ['active'],
  events: ['flexible'],
  sessions: ['focus_mode'],
  attempts: ['completed'],
  projects: ['archived'],
  workflows: ['focus'],
  songs: ['done'],
};

export const opSchema = z.object({
  op_id: z.string().min(8).max(64),
  entity: z.enum(ENTITY_NAMES as [EntityName, ...EntityName[]]),
  action: z.enum(['put', 'delete']),
  id,
  data: z.record(z.string(), z.unknown()).optional(),
  ts: ms,
});
export type Op = z.infer<typeof opSchema>;

export const pushBodySchema = z.object({ ops: z.array(opSchema).max(200) });

export interface OpResult {
  op_id: string;
  status: 'applied' | 'duplicate' | 'stale' | 'rejected';
  error?: string;
}
