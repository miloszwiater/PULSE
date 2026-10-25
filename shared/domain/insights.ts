import type { SkillCategory } from '../schema';
import { CATEGORY_LABEL, EXERCISE_BY_ID } from '../catalog/exercises';
import { addDays, daysBetween } from '../time';
import { effectiveStatus } from './day';
import { alive, type Snapshot } from './snapshot';
import { countsAsSession, sessionDate } from './sessions';
import { categoryStats, progressionAdvice } from './training';
import { SKILL_CATEGORIES } from '../schema';

export type InsightAction =
  | { type: 'exercise'; exercise_id: string }
  | { type: 'plan_week' }
  | { type: 'profile_patch'; patch: Record<string, unknown>; label: string }
  | { type: 'level'; category: SkillCategory; level: number };

export interface Insight {
  key: string;
  /** observation = fact computed from records; hypothesis = an interpretation of those facts. */
  kind: 'observation' | 'hypothesis';
  priority: number;
  title: string;
  body: string;
  evidence: string[];
  action?: InsightAction;
}

/**
 * Rule-based mentor layer. Works without any AI provider and is the
 * evidence base the AI mentor receives. Every insight lists its evidence.
 */
export function insights(snap: Snapshot, today: string): Insight[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const out: Insight[] = [];
  const started = snap.profile?.start_date ?? today;
  const age = daysBetween(started, today);
  const sessions = alive(snap.sessions).filter(countsAsSession);
  const last21 = sessions.filter((s) => daysBetween(sessionDate(s, tz), today) <= 21);

  // 1. Lots of work, nothing finished
  const finishing = last21.filter((s) => ['demo', 'recording', 'mix', 'finished'].includes(s.outcome));
  const advancedProjects = alive(snap.projects).filter((p) => ['demo', 'recording', 'mix', 'ready', 'released'].includes(p.stage));
  if (last21.length >= 5 && finishing.length === 0) {
    out.push({
      key: 'finish-gap', kind: 'hypothesis', priority: 1,
      title: 'Dużo pracy, mało domykania',
      body: 'W ostatnich 3 tygodniach było sporo sesji, ale żadna nie zakończyła się demem ani nagraniem. Możliwe, że praca rozprasza się na fragmenty. Propozycja: jeden tydzień skupiony na doprowadzeniu jednego szkicu do pełnego dema.',
      evidence: [`${last21.length} sesji w 21 dni`, 'rezultat demo/nagranie/miks: 0', `projekty na etapie demo lub dalej: ${advancedProjects.length}`],
      action: { type: 'exercise', exercise_id: 'pr-finish-demo' },
    });
  }

  // 2. Neglected focus areas
  const stats = categoryStats(snap, today);
  for (const cat of snap.profile?.focus_categories ?? []) {
    const st = stats.find((s) => s.category === cat);
    if (!st || age < 7) continue;
    if (st.daysSince == null || st.daysSince >= 14) {
      out.push({
        key: `neglect-${cat}`, kind: 'observation', priority: 2,
        title: `${CATEGORY_LABEL[cat]} — priorytet bez praktyki`,
        body: `Ten obszar jest oznaczony jako priorytet, a ${st.daysSince == null ? 'nie ma w nim jeszcze żadnej zapisanej pracy' : `ostatnia praca była ${st.daysSince} dni temu`}.`,
        evidence: [`ćwiczenia w 30 dni: ${st.attempts30}`, `sesje w 30 dni: ${st.sessions30}`],
      });
    }
  }

  // 3. Repeatedly skipped
  const skippedBy = new Map<string, number>();
  for (const e of alive(snap.events)) {
    if (e.status !== 'skipped' || daysBetween(e.date, today) > 21) continue;
    const k = e.category ?? e.kind;
    skippedBy.set(k, (skippedBy.get(k) ?? 0) + 1);
  }
  for (const [k, n] of skippedBy) {
    if (n < 2) continue;
    const label = (CATEGORY_LABEL as Record<string, string>)[k] ?? k;
    out.push({
      key: `skip-${k}`, kind: 'observation', priority: 2,
      title: `Pomijane: ${label}`,
      body: `Ten typ zadań został pominięty ${n}× w 3 tygodnie. Zamiast dokładać więcej, warto zmienić metodę albo porę dnia.`,
      evidence: [`pominięcia w 21 dni: ${n}`],
    });
  }

  // 4. Imbalance in the last 30 days
  const catMinutes = new Map<SkillCategory, number>();
  let total = 0;
  for (const s of sessions) {
    if (daysBetween(sessionDate(s, tz), today) > 30) continue;
    const c = s.category;
    if (!c) continue;
    catMinutes.set(c, (catMinutes.get(c) ?? 0) + s.active_seconds / 60);
    total += s.active_seconds / 60;
  }
  if (total >= 240) {
    for (const [c, m] of catMinutes) {
      if (m / total >= 0.6) {
        const missing = SKILL_CATEGORIES.filter((x) => !catMinutes.has(x)).map((x) => CATEGORY_LABEL[x]);
        out.push({
          key: `imbalance-${c}`, kind: 'observation', priority: 3,
          title: 'Nierówny rozkład pracy',
          body: `${Math.round((m / total) * 100)}% czasu z przypisaną kategorią w ostatnich 30 dniach to ${CATEGORY_LABEL[c]}.${missing.length ? ` Bez pracy: ${missing.join(', ')}.` : ''}`,
          evidence: [`${Math.round(m)} z ${Math.round(total)} min`],
        });
      }
    }
  }

  // 5. Energy signals
  const care7 = alive(snap.care).filter((c) => daysBetween(c.date, today) <= 7 && (c.signal === 'low' || c.signal === 'overloaded'));
  if (care7.length >= 3 && (snap.profile?.weekly_session_target ?? 0) > 1) {
    const t = snap.profile!.weekly_session_target;
    out.push({
      key: 'energy-load', kind: 'hypothesis', priority: 1,
      title: 'Obciążenie jest za wysokie',
      body: `W ostatnim tygodniu było ${care7.length} zgłoszeń braku energii lub przeciążenia. Utrzymywalny rok jest ważniejszy niż ambitny tydzień — proponuję tymczasowo obniżyć cel sesji.`,
      evidence: care7.map((c) => `${c.date}: ${c.signal === 'low' ? 'brak energii' : 'przeciążenie'}`),
      action: { type: 'profile_patch', patch: { weekly_session_target: t - 1 }, label: `Cel tygodniowy: ${t} → ${t - 1} sesji` },
    });
  }

  // 6. Book read without practice
  for (const b of alive(snap.books)) {
    if (b.status !== 'read' || !b.status_changed_at) continue;
    const readDay = new Date(b.status_changed_at).toISOString().slice(0, 10);
    if (daysBetween(readDay, today) > 30) continue;
    const practiced = alive(snap.attempts).some((a) => a.exercise_id === 'an-reading-to-beat' && a.date >= readDay);
    if (!practiced) {
      out.push({
        key: `book-practice-${b.id}`, kind: 'observation', priority: 2,
        title: `Po lekturze: ${b.title}`,
        body: b.practice ? `Ćwiczenie po lekturze: ${b.practice}` : 'Zamień jedną technikę z książki w 8 wersów na beacie.',
        evidence: [`przeczytana ${readDay}`, 'brak ćwiczenia „Z lektury na beat” od tego czasu'],
        action: { type: 'exercise', exercise_id: 'an-reading-to-beat' },
      });
    }
  }

  // 7. Progression
  for (const cat of SKILL_CATEGORIES) {
    const adv = progressionAdvice(snap, cat);
    if (!adv) continue;
    if (adv.kind === 'switch_method') {
      out.push({
        key: `method-${cat}`, kind: 'observation', priority: 2,
        title: `${CATEGORY_LABEL[cat]}: zmień metodę`,
        body: adv.reason + (adv.alternative ? ` Spróbuj: „${adv.alternative.title}”.` : ''),
        evidence: adv.evidence,
        action: adv.alternative ? { type: 'exercise', exercise_id: adv.alternative.id } : undefined,
      });
    } else {
      out.push({
        key: `level-${cat}`, kind: 'observation', priority: 2,
        title: `${CATEGORY_LABEL[cat]}: ${adv.kind === 'level_up' ? 'czas podnieść poziom' : 'powrót do fundamentów'}`,
        body: adv.reason,
        evidence: adv.evidence,
        action: { type: 'level', category: cat, level: adv.toLevel },
      });
    }
  }

  // 8. Long pause without a protective reason
  if (age >= 10) {
    const lastSession = sessions.map((s) => sessionDate(s, tz)).sort().pop();
    const gap = lastSession ? daysBetween(lastSession, today) : age;
    if (gap >= 10) {
      let protectedDays = 0;
      for (let i = 0; i < gap; i++) {
        const st = effectiveStatus(snap, addDays(today, -i)).status;
        if (st === 'sick' || st === 'vacation' || st === 'off') protectedDays++;
      }
      if (protectedDays < gap / 2) {
        out.push({
          key: 'gap', kind: 'observation', priority: 1,
          title: `${gap} dni bez sesji`,
          body: 'Powrót nie wymaga nadrabiania. Jedna krótka sesja na własnym beacie wystarczy, żeby wrócić do rytmu.',
          evidence: [lastSession ? `ostatnia sesja: ${lastSession}` : 'brak zapisanych sesji', `dni chronione w tym czasie: ${protectedDays}`],
        });
      }
    }
  }

  // 9. Recently completed exercise was rated easy but not yet acted upon — covered by progression.
  return out.sort((a, b) => a.priority - b.priority);
}

export function exerciseTitle(id: string): string {
  return EXERCISE_BY_ID[id]?.title ?? id;
}
