import { CATEGORY_LABEL, EXERCISE_BY_ID, LEVEL_LABEL } from '../catalog/exercises';
import { BOOKS } from '../catalog/books';
import { EXERCISES } from '../catalog/exercises';
import { addDays, durationLabel, hhmm, weekStart } from '../time';
import { dayContext } from './day';
import { insights } from './insights';
import { goalProgress, streak, weekStats } from './metrics';
import { artistStage } from './roadmap';
import { alive, type Clock, type Snapshot } from './snapshot';
import { SESSION_TYPE_LABEL, countsAsSession, sessionDate } from './sessions';
import { categoryStats } from './training';

const OUTCOME_PL: Record<string, string> = {
  none: 'brak', idea: 'pomysł', verses: 'wersy', hook: 'refren', demo: 'demo', recording: 'nagranie',
  mix: 'miks', finished: 'ukończony utwór', exercise: 'ćwiczenie', notes: 'notatki',
};

/**
 * Compact, factual description of the user's situation for the AI mentor.
 * Everything here is computed from records; nothing is inferred.
 */
export function buildMentorContext(snap: Snapshot, clock: Clock): string {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const p = snap.profile;
  const L: string[] = [];
  L.push(`Dziś: ${clock.today}, godz. ${hhmm(clock.nowMin)}.`);
  if (p) {
    L.push(`Profil: ${p.artist_name || p.display_name || 'artysta'}; gatunki: ${p.genres.join(', ') || '—'}; inspiracje: ${p.inspirations.join(', ') || '—'}.`);
    L.push(`Deklarowane mocne strony: ${p.strengths.join(', ') || '—'}; słabsze: ${p.weaknesses.join(', ') || '—'}; priorytety: ${p.focus_categories.map((c) => CATEGORY_LABEL[c]).join(', ') || '—'}.`);
    if (p.goals_text) L.push(`Cele własnymi słowami: ${p.goals_text.slice(0, 600)}`);
    L.push(`Cel tygodnia: ${p.weekly_session_target} sesji. Start programu 365: ${p.start_date ?? 'nie ustawiono'}.`);
    L.push(`Analiza tekstów: ${p.mentor_text_consent ? 'użytkownik zgodził się na analizę fragmentów, które sam wklei' : 'brak zgody — nie analizuj tekstów'}.`);
  }
  L.push(`Etap artysty: ${artistStage(snap)}.`);

  const w = weekStats(snap, clock.today, clock.today);
  L.push(`\nBieżący tydzień (od ${w.weekStart}): ${w.sessionCount}/${w.adjustedTarget} sesji (cel bazowy ${w.baseTarget}, dni chronione ${w.protectedDays}), ${durationLabel(w.minutes)} pracy. Plan: zrealizowane ${w.fulfilled}, częściowo ${w.partial}, pominięte ${w.skipped}, otwarte ${w.open}, usprawiedliwione ${w.excused}.`);
  for (let i = 1; i <= 3; i++) {
    const pw = weekStats(snap, addDays(weekStart(clock.today), -7 * i), clock.today);
    L.push(`Tydzień od ${pw.weekStart}: ${pw.sessionCount}/${pw.adjustedTarget} sesji, ${durationLabel(pw.minutes)}, stan: ${pw.state}.`);
  }
  const st = streak(snap, clock.today);
  L.push(`Regularność: ${st.current} tyg. z rzędu, najlepiej ${st.best}, łącznie utrzymanych ${st.keptTotal}.`);

  L.push('\nObszary (poziom, ćwiczenia w 30 dni, dni od ostatniej pracy):');
  for (const c of categoryStats(snap, clock.today)) {
    L.push(`- ${CATEGORY_LABEL[c.category]}: poziom ${c.level} (${LEVEL_LABEL[c.level]}), ćwiczenia ${c.attempts30}, sesje ${c.sessions30}, ${c.daysSince == null ? 'nigdy' : `${c.daysSince} dni temu`}.`);
  }

  const recent = alive(snap.sessions).filter((s) => countsAsSession(s) && sessionDate(s, tz) >= addDays(clock.today, -14))
    .sort((a, b) => b.started_at - a.started_at).slice(0, 12);
  L.push('\nOstatnie sesje (14 dni):');
  if (!recent.length) L.push('- brak');
  for (const s of recent) {
    const ex = s.exercise_id ? EXERCISE_BY_ID[s.exercise_id]?.title : null;
    L.push(`- ${sessionDate(s, tz)} ${SESSION_TYPE_LABEL[s.type]}${ex ? ` (${ex})` : ''}, ${durationLabel(s.active_seconds / 60)}, rezultat: ${OUTCOME_PL[s.outcome]}${s.outcome_note ? ` — „${s.outcome_note.slice(0, 160)}”` : ''}${s.energy_after ? `, energia po: ${s.energy_after}/5` : ''}.`);
  }

  const atts = alive(snap.attempts).filter((a) => a.date >= addDays(clock.today, -21)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  if (atts.length) {
    L.push('\nOceny ćwiczeń (21 dni):');
    for (const a of atts) L.push(`- ${a.date} ${EXERCISE_BY_ID[a.exercise_id]?.title ?? a.exercise_id}: ${a.completed ? 'ukończone' : 'nieukończone'}, ${a.difficulty === 'easy' ? 'za łatwe' : a.difficulty === 'hard' ? 'za trudne' : 'w sam raz'}${a.feedback ? ` — „${a.feedback.slice(0, 140)}”` : ''}.`);
  }

  L.push('\nNajbliższe 7 dni (identyfikatory wydarzeń do propozycji zmian):');
  for (let i = 0; i < 7; i++) {
    const d = addDays(clock.today, i);
    const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
    const blocks = ctx.blocks.filter((b) => b.start < 1440).map((b) => `${b.title} ${hhmm(b.start)}–${hhmm(b.end)}`).join(', ');
    const evs = alive(snap.events).filter((e) => e.date === d && ['music', 'training', 'reading', 'promo'].includes(e.kind))
      .map((e) => `[${e.id}] ${e.title} ${hhmm(e.start_min)}–${hhmm(e.end_min)} (${e.status}, priorytet ${e.priority})`).join('; ');
    const wins = ctx.windows.map((x) => `${hhmm(x.start)}–${hhmm(x.end)}`).join(', ');
    L.push(`- ${d}: status ${ctx.status}, tryb ${ctx.mode} (max ${ctx.maxMinutes} min). Obowiązki: ${blocks || 'brak'}. Rozwój: ${evs || 'brak'}. Wolne okna: ${wins || 'brak'}.`);
  }

  const care = alive(snap.care).filter((c) => c.date >= addDays(clock.today, -14)).sort((a, b) => b.at - a.at).slice(0, 6);
  if (care.length) {
    L.push('\nSygnały samopoczucia (14 dni):');
    for (const c of care) L.push(`- ${c.date}: ${c.signal}${c.until ? ` do ${c.until}` : ''}${c.note ? ` — „${c.note.slice(0, 120)}”` : ''}`);
  }

  const projects = alive(snap.projects).filter((x) => !x.archived);
  if (projects.length) {
    L.push('\nProjekty:');
    for (const x of projects.slice(0, 10)) L.push(`- ${x.title} — etap ${x.stage}${x.last_worked_at ? `, ostatnio ${new Date(x.last_worked_at).toISOString().slice(0, 10)}` : ''}.`);
  }
  const books = alive(snap.books);
  if (books.length) {
    L.push('\nBiblioteka:');
    for (const b of books.slice(0, 10)) L.push(`- ${b.title} (${b.author}) — ${b.status}${b.due_date ? `, termin orientacyjny ${b.due_date}` : ''}.`);
  }
  const goals = alive(snap.goals).filter((g) => g.status === 'active');
  if (goals.length) {
    L.push('\nCele:');
    for (const g of goals.slice(0, 8)) {
      const pr = goalProgress(snap, g, clock.today);
      L.push(`- ${g.title}: ${pr.value}/${pr.target}${g.due_date ? ` do ${g.due_date}` : ''}.`);
    }
  }
  const ins = insights(snap, clock.today);
  if (ins.length) {
    L.push('\nObserwacje reguł PULSE:');
    for (const i of ins.slice(0, 6)) L.push(`- [${i.kind === 'observation' ? 'z danych' : 'hipoteza'}] ${i.title}: ${i.body} (dowody: ${i.evidence.join('; ')})`);
  }
  return L.join('\n');
}

/** Static catalog description — belongs in the cached system prompt, not the per-turn context. */
export function catalogText(): string {
  return [
    'Katalog ćwiczeń (id — tytuł [kategoria, poziom, minuty]):',
    ...EXERCISES.map((e) => `- ${e.id} — ${e.title} [${e.category}, L${e.level}, ${e.minutes} min]: ${e.goal}`),
    '',
    'Katalog książek (klucz — tytuł, autor):',
    ...BOOKS.map((b) => `- ${b.key} — ${b.title}, ${b.author}: ${b.learning_goal}`),
  ].join('\n');
}
