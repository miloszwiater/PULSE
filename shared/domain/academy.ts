import { LESSON_BY_KEY, PATHS, PATH_BY_KEY, type Lesson, type LearningPath, type PathKey } from '../catalog/academy';
import { BOOKS, type CatalogBook } from '../catalog/books';
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

/* ---------- books ---------- */

export interface BookRecommendation { book: CatalogBook; why: string }

/**
 * Real titles matched to what the person is actually learning. Books already
 * in the library are skipped; voice and theory first when those paths are active.
 */
export function recommendBooks(snap: Snapshot, limit = 4): BookRecommendation[] {
  const owned = new Set(alive(snap.books).map((b) => b.catalog_key).filter(Boolean));
  const progress = allProgress(snap);
  const active = new Set(progress.filter((p) => p.state === 'active').map((p) => p.path.key));
  const done = new Set(progress.filter((p) => p.state === 'done').map((p) => p.path.key));
  const scored: (BookRecommendation & { score: number })[] = [];
  for (const b of BOOKS) {
    if (b.retired || owned.has(b.key)) continue;
    let score = 0;
    let why = b.why;
    const hit = b.paths.find((p) => active.has(p));
    const after = b.paths.find((p) => done.has(p));
    if (hit) { score += 3; why = `Pogłębia ścieżkę „${PATH_BY_KEY[hit].title}”, którą masz w toku. ${b.why}`; }
    else if (after) { score += 2; why = `Kontynuacja ukończonej ścieżki „${PATH_BY_KEY[after].title}”. ${b.why}`; }
    if (b.verified) score += 0.5;
    if (b.kind === 'voice' || b.kind === 'theory') score += 0.3;
    if (b.pl) score += 0.2;
    scored.push({ book: b, why, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(({ book, why }) => ({ book, why }));
}

/** After a book is finished: the next one, preferring the same path. */
export function nextBookAfter(snap: Snapshot, finishedKey: string | null): BookRecommendation | null {
  const finished = finishedKey ? BOOKS.find((b) => b.key === finishedKey) : undefined;
  const recs = recommendBooks(snap, 10);
  if (finished) {
    const same = recs.find((r) => r.book.paths.some((p) => finished.paths.includes(p)));
    if (same) return { book: same.book, why: `Po „${finished.title}”: ${same.why}` };
  }
  return recs[0] ?? null;
}
