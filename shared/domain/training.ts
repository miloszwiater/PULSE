import { SKILL_CATEGORIES, type Attempt, type SkillCategory } from '../schema';
import { EXERCISES, EXERCISE_BY_ID, type Exercise } from '../catalog/exercises';
import { daysBetween } from '../time';
import { alive, type Snapshot } from './snapshot';
import { categoryOfSession, countsAsSession, sessionDate } from './sessions';

export function levelOf(snap: Snapshot, cat: SkillCategory): number {
  return alive(snap.skill_levels).find((l) => l.category === cat)?.level ?? 1;
}

export interface ProgressionAdvice {
  category: SkillCategory;
  kind: 'level_up' | 'step_back' | 'switch_method';
  fromLevel: number;
  toLevel: number;
  reason: string;
  evidence: string[];
  alternative?: Exercise;
}

function lastAttempts(snap: Snapshot, cat: SkillCategory, n: number): Attempt[] {
  return alive(snap.attempts)
    .filter((a) => a.category === cat)
    .sort((a, b) => b.updated_at - a.updated_at)
    .slice(0, n);
}

/**
 * Progression rules (no AI):
 * - two most recent completed attempts rated "easy" at the current level → level up
 * - two most recent attempts rated "hard" or not completed → change the method
 *   at the same level; if the method was already changed → step back a level.
 */
export function progressionAdvice(snap: Snapshot, cat: SkillCategory): ProgressionAdvice | null {
  const level = levelOf(snap, cat);
  const recent = lastAttempts(snap, cat, 4).filter((a) => a.level === level);
  if (recent.length < 2) return null;
  const [a, b] = recent;
  const ev = [a, b].map((x) => `${EXERCISE_BY_ID[x.exercise_id]?.title ?? x.exercise_id}: ${x.completed ? 'ukończone' : 'nieukończone'}, ocena „${DIFF_LABEL[x.difficulty]}” (${x.date})`);
  if (a.completed && b.completed && a.difficulty === 'easy' && b.difficulty === 'easy' && level < 4) {
    return { category: cat, kind: 'level_up', fromLevel: level, toLevel: level + 1, reason: 'Dwa ostatnie ćwiczenia na tym poziomie były za łatwe.', evidence: ev };
  }
  const struggling = (x: Attempt) => !x.completed || x.difficulty === 'hard';
  if (struggling(a) && struggling(b)) {
    const methods = new Set([a, b].map((x) => EXERCISE_BY_ID[x.exercise_id]?.method));
    const alt = EXERCISES.find((e) => e.category === cat && e.level === level && !methods.has(e.method));
    const third = recent[2];
    if (third && struggling(third) && level > 1) {
      return { category: cat, kind: 'step_back', fromLevel: level, toLevel: level - 1, reason: 'Trzy kolejne próby były za trudne — wróć do fundamentów.', evidence: ev };
    }
    return { category: cat, kind: 'switch_method', fromLevel: level, toLevel: level, reason: 'Ten sam problem wraca — zmień metodę, nie poziom.', evidence: ev, alternative: alt };
  }
  return null;
}

export const DIFF_LABEL = { easy: 'za łatwe', right: 'w sam raz', hard: 'za trudne' } as const;

export interface CategoryStat {
  category: SkillCategory;
  level: number;
  attempts30: number;
  sessions30: number;
  lastDate: string | null;
  daysSince: number | null;
}

export function categoryStats(snap: Snapshot, today: string): CategoryStat[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  return SKILL_CATEGORIES.map((cat) => {
    const atts = alive(snap.attempts).filter((a) => a.category === cat);
    const sess = alive(snap.sessions).filter((s) => countsAsSession(s) && categoryOfSession(s) === cat);
    const dates = [...atts.map((a) => a.date), ...sess.map((s) => sessionDate(s, tz))].sort();
    const lastDate = dates[dates.length - 1] ?? null;
    return {
      category: cat,
      level: levelOf(snap, cat),
      attempts30: atts.filter((a) => daysBetween(a.date, today) <= 30).length,
      sessions30: sess.filter((s) => daysBetween(sessionDate(s, tz), today) <= 30).length,
      lastDate,
      daysSince: lastDate ? daysBetween(lastDate, today) : null,
    };
  });
}

export interface Recommendation {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

/**
 * Deterministic exercise recommendation:
 * neglect (days since last practice) + declared focus/weakness, minus recent
 * repetition; exercises skipped twice recently are replaced by another method.
 */
export function recommendExercises(snap: Snapshot, today: string, opts: { maxMinutes?: number; limit?: number; category?: SkillCategory } = {}): Recommendation[] {
  const stats = categoryStats(snap, today);
  const focus = new Set(snap.profile?.focus_categories ?? []);
  const skipped = new Map<string, number>();
  for (const e of alive(snap.events)) {
    if (e.exercise_id && e.status === 'skipped' && daysBetween(e.date, today) <= 21) skipped.set(e.exercise_id, (skipped.get(e.exercise_id) ?? 0) + 1);
  }
  const doneRecently = new Map<string, number>();
  for (const a of alive(snap.attempts)) {
    const d = daysBetween(a.date, today);
    if (d <= 14) doneRecently.set(a.exercise_id, Math.min(doneRecently.get(a.exercise_id) ?? 99, d));
  }
  const completedEver = new Set(alive(snap.attempts).filter((a) => a.completed).map((a) => a.exercise_id));
  const out: Recommendation[] = [];
  for (const ex of EXERCISES) {
    const st = stats.find((s) => s.category === ex.category)!;
    if (opts.category && ex.category !== opts.category) continue;
    if (ex.level > st.level || ex.level < st.level - 1) continue;
    if (opts.maxMinutes && ex.minutes > opts.maxMinutes) continue;
    const reasons: string[] = [];
    let score = 0;
    const since = st.daysSince ?? 30;
    score += Math.min(since, 30) / 7;
    if (st.daysSince == null) reasons.push('ten obszar nie był jeszcze ćwiczony');
    else if (since >= 7) reasons.push(`${since} dni od ostatniej pracy w tym obszarze`);
    if (focus.has(ex.category)) { score += 2; reasons.push('obszar oznaczony jako priorytet'); }
    if (ex.level === st.level) score += 1;
    else { score -= 0.5; reasons.push('powtórka fundamentu'); }
    if (!completedEver.has(ex.id)) score += 0.7;
    const rec = doneRecently.get(ex.id);
    if (rec != null) score -= 3 - rec / 7;
    const sk = skipped.get(ex.id) ?? 0;
    if (sk >= 2) { score -= 4; }
    out.push({ exercise: ex, score, reasons });
  }
  // Exercises skipped repeatedly: suggest a different method in the same category instead.
  for (const [exId, n] of skipped) {
    if (n < 2) continue;
    const ex = EXERCISE_BY_ID[exId];
    const alt = out.find((r) => r.exercise.category === ex?.category && r.exercise.method !== ex?.method);
    if (alt) { alt.score += 1; alt.reasons.push(`zamiast „${ex.title}”, które pominięto ${n}×`); }
  }
  out.sort((a, b) => b.score - a.score);
  // Diversity: at most 2 per category in the top list.
  const per = new Map<string, number>();
  const res: Recommendation[] = [];
  for (const r of out) {
    const c = per.get(r.exercise.category) ?? 0;
    if (c >= 2) continue;
    per.set(r.exercise.category, c + 1);
    res.push(r);
    if (res.length >= (opts.limit ?? 5)) break;
  }
  return res;
}
