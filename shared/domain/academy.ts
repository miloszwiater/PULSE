import { LESSON_BY_KEY, PATHS, PATH_BY_KEY, type Lesson, type LearningPath, type PathKey } from '../catalog/academy';
import { learningSchema, type Learning } from '../schema';
import { alive, type Snapshot } from './snapshot';

export type PathState = 'new' | 'active' | 'paused' | 'done';

export interface PathProgress {
  path: LearningPath;
  state: PathState;
  done: number;
  total: number;
  /** First lesson not completed yet, in order; null when every lesson is done. */
  next: Lesson | null;
  startedAt: number | null;
  lastOpenedAt: number | null;
}

const rowsOf = (snap: Snapshot) => alive(snap.learning);

export function lessonRow(snap: Snapshot, key: string): Learning | undefined {
  return rowsOf(snap).find((r) => r.id === key && r.kind === 'lesson');
}

export function pathRow(snap: Snapshot, key: PathKey): Learning | undefined {
  return rowsOf(snap).find((r) => r.id === key && r.kind === 'path');
}

export function isLessonDone(snap: Snapshot, key: string): boolean {
  return lessonRow(snap, key)?.status === 'done';
}

/**
 * Progress counts completed lessons — a fact the person marks themselves.
 * Time spent is never treated as mastery.
 */
export function pathProgress(snap: Snapshot, key: PathKey): PathProgress {
  const path = PATH_BY_KEY[key];
  const row = pathRow(snap, key);
  const done = path.lessons.filter((l) => isLessonDone(snap, l.key)).length;
  const next = path.lessons.find((l) => !isLessonDone(snap, l.key)) ?? null;
  let state: PathState = row ? (row.status === 'paused' ? 'paused' : row.status === 'done' ? 'done' : 'active') : 'new';
  if (state !== 'paused' && done === path.lessons.length) state = 'done';
  const lastLesson = rowsOf(snap).filter((r) => r.kind === 'lesson' && r.path_key === key)
    .reduce((m, r) => Math.max(m, r.last_opened_at ?? 0), 0);
  return {
    path, state, done, total: path.lessons.length, next,
    startedAt: row?.started_at ?? null,
    lastOpenedAt: Math.max(row?.last_opened_at ?? 0, lastLesson) || null,
  };
}

export function allProgress(snap: Snapshot): PathProgress[] {
  return PATHS.map((p) => pathProgress(snap, p.key));
}

export function activePaths(snap: Snapshot): PathProgress[] {
  return allProgress(snap).filter((p) => p.state === 'active')
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0));
}

/** Next lesson the planner may suggest: from the most recently used active path. */
export function nextLessonToSuggest(snap: Snapshot): (Lesson & { path: PathKey }) | null {
  for (const p of activePaths(snap)) if (p.next) return LESSON_BY_KEY[p.next.key];
  return null;
}

/* ---------- row builders (pure; the client commits them) ---------- */

export function startPathRow(snap: Snapshot, key: PathKey, now: number): Learning {
  const cur = pathRow(snap, key);
  return learningSchema.parse({
    ...(cur ?? {}), id: key, kind: 'path', path_key: key, status: 'active',
    started_at: cur?.started_at ?? now, last_opened_at: now, updated_at: now, deleted_at: null,
  });
}

export function setPathStatusRow(snap: Snapshot, key: PathKey, status: Learning['status'], now: number): Learning {
  const cur = pathRow(snap, key);
  return learningSchema.parse({
    ...(cur ?? {}), id: key, kind: 'path', path_key: key, status,
    started_at: cur?.started_at ?? now, done_at: status === 'done' ? now : null, updated_at: now, deleted_at: null,
  });
}

/** Opening a lesson records it (and starts the path if needed). Re-opening a completed lesson counts as a revisit. */
export function openLessonRows(snap: Snapshot, key: string, now: number): Learning[] {
  const l = LESSON_BY_KEY[key];
  if (!l) return [];
  const cur = lessonRow(snap, key);
  const out: Learning[] = [];
  const path = pathRow(snap, l.path);
  if (!path || path.status === 'paused') out.push(startPathRow(snap, l.path, now));
  out.push(learningSchema.parse({
    ...(cur ?? {}), id: key, kind: 'lesson', path_key: l.path, status: cur?.status ?? 'active',
    started_at: cur?.started_at ?? now, last_opened_at: now,
    revisits: (cur?.revisits ?? 0) + (cur?.status === 'done' ? 1 : 0),
    updated_at: now, deleted_at: null,
  }));
  return out;
}

export function completeLessonRow(snap: Snapshot, key: string, done: boolean, now: number): Learning | null {
  const l = LESSON_BY_KEY[key];
  if (!l) return null;
  const cur = lessonRow(snap, key);
  return learningSchema.parse({
    ...(cur ?? {}), id: key, kind: 'lesson', path_key: l.path, status: done ? 'done' : 'active',
    started_at: cur?.started_at ?? now, done_at: done ? now : null, last_opened_at: now, updated_at: now, deleted_at: null,
  });
}
