import type { Milestone } from '../schema';
import { MILESTONE_TEMPLATES, PHASES, type ArtistStage, type MilestoneTemplate } from '../catalog/career';
import { SKILL_CATEGORIES } from '../schema';
import { daysBetween } from '../time';
import { streak } from './metrics';
import { alive, newId, type Snapshot } from './snapshot';

export interface EvidenceResult { met: boolean; detail: string }

/** Evidence checks: a milestone is never granted for elapsed time alone. */
export function checkEvidence(snap: Snapshot, check: NonNullable<MilestoneTemplate['check']>, today: string): EvidenceResult {
  const projects = alive(snap.projects);
  const atLeast = (stages: string[]) => projects.filter((p) => stages.includes(p.stage)).length;
  switch (check) {
    case 'kept_weeks_4': {
      const s = streak(snap, today);
      return { met: s.keptTotal >= 4, detail: `utrzymane tygodnie: ${s.keptTotal}/4` };
    }
    case 'all_categories_tried': {
      const done = new Set(alive(snap.attempts).filter((a) => a.completed).map((a) => a.category));
      return { met: SKILL_CATEGORIES.every((c) => done.has(c)), detail: `obszary z ukończonym ćwiczeniem: ${done.size}/5` };
    }
    case 'first_demo': {
      const n = atLeast(['demo', 'recording', 'mix', 'ready', 'released']) + alive(snap.sessions).filter((s) => s.outcome === 'demo').length;
      return { met: n >= 1, detail: n ? 'jest co najmniej jedno demo' : 'brak dema' };
    }
    case 'three_demos': {
      const n = atLeast(['demo', 'recording', 'mix', 'ready', 'released']);
      return { met: n >= 3, detail: `projekty na etapie demo+: ${n}/3` };
    }
    case 'finished_3': {
      const n = atLeast(['ready', 'released']);
      return { met: n >= 3, detail: `gotowe utwory: ${n}/3` };
    }
    case 'first_release': {
      const n = atLeast(['released']);
      return { met: n >= 1, detail: `wydane: ${n}` };
    }
    case 'book_read': {
      const n = alive(snap.books).filter((b) => b.status === 'read').length;
      return { met: n >= 1, detail: `przeczytane: ${n}` };
    }
    case 'promo_5': {
      const n = alive(snap.promo_tasks).filter((t) => t.status === 'done').length;
      return { met: n >= 5, detail: `wykonane działania: ${n}/5` };
    }
  }
}

export function seedMilestones(now: number): Milestone[] {
  return MILESTONE_TEMPLATES.map((t, i) => ({
    id: newId('ms'), updated_at: now, deleted_at: null, phase: t.phase, title: t.title, description: t.description,
    status: 'open', order: i, template_key: t.key, done_at: null,
  }));
}

export interface PhaseView {
  n: number;
  title: string;
  months: string;
  focus: string;
  milestones: (Milestone & { evidence?: EvidenceResult })[];
  done: number;
  total: number;
}

export interface RoadmapView {
  day: number | null;
  calendarPhase: number | null;
  /** First phase with unfinished milestones — the real position, independent of the calendar. */
  actualPhase: number;
  phases: PhaseView[];
}

export function roadmapView(snap: Snapshot, today: string): RoadmapView {
  const start = snap.profile?.start_date;
  const day = start ? daysBetween(start, today) + 1 : null;
  const calendarPhase = day == null ? null : Math.min(4, Math.max(1, Math.ceil(day / 91.25)));
  const tmpl = new Map(MILESTONE_TEMPLATES.map((t) => [t.key, t]));
  const ms = alive(snap.milestones).sort((a, b) => a.order - b.order);
  const phases: PhaseView[] = PHASES.map((p) => {
    const list = ms.filter((m) => m.phase === p.n).map((m) => {
      const t = m.template_key ? tmpl.get(m.template_key) : undefined;
      return t?.check ? { ...m, evidence: checkEvidence(snap, t.check, today) } : { ...m };
    });
    const done = list.filter((m) => m.status === 'done' || m.status === 'skipped').length;
    return { n: p.n, title: p.title, months: p.months, focus: p.focus, milestones: list, done, total: list.length };
  });
  const actual = phases.find((p) => p.done < p.total)?.n ?? 4;
  return { day, calendarPhase, actualPhase: actual, phases };
}

/** Where the artist is in the release cycle — gates Promotion Academy tasks. */
export function artistStage(snap: Snapshot): ArtistStage {
  const ps = alive(snap.projects);
  if (ps.some((p) => p.stage === 'released')) return 'growth';
  if (ps.some((p) => p.stage === 'ready' || p.stage === 'mix')) return 'release';
  if (ps.some((p) => ['demo', 'recording'].includes(p.stage))) return 'catalog';
  return 'foundation';
}

export const STAGE_ORDER: ArtistStage[] = ['foundation', 'catalog', 'release', 'growth'];
