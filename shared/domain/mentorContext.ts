import { PATHS } from '../catalog/academy';
import { BOOKS, CATEGORY_LABEL, DIFFICULTY_LABEL, SKILL_LABEL, type Skill } from '../catalog/books';
import { BOOK_STATUS_LABEL, hoursLabel, readingHours, tasteOf } from './library';
import { addDays, durationLabel, hhmm, weekStart, zoned } from '../time';
import { allProgress } from './academy';
import { dayContext } from './day';
import { insights, misses } from './insights';
import { streak, weekStats } from './metrics';
import { alive, type Clock, type Snapshot } from './snapshot';
import { countsAsSession, sessionDate } from './sessions';
import { breaks, returnState, spontaneousShare } from './workflow';

/**
 * Compact, factual description of the person's situation for the AI
 * companion. Everything here is computed from records; nothing is inferred.
 * Song lyrics and notes are never included.
 */
export function buildMentorContext(snap: Snapshot, clock: Clock): string {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const p = snap.profile;
  const L: string[] = [];
  L.push(`Dziś: ${clock.today}, godz. ${hhmm(clock.nowMin)}.`);
  if (p) {
    L.push(`Osoba: ${p.artist_name || p.display_name || '—'}; muzyka: ${p.music_style || p.genres.join(', ') || '—'}; inspiracje: ${p.inspirations.join(', ') || '—'}.`);
    L.push(`Rytm docelowy: ${p.weekly_session_target} sesji tygodniowo (zachęta, nie wymóg). Typowa długość sesji: ${p.session_default_min} min. Bloki nauki tygodniowo: ${p.learning_per_week}. Pobudka ${hhmm(p.wake_min)}, sen ${hhmm(p.bed_min)}.`);
  }

  const w = weekStats(snap, clock.today, clock.today);
  L.push(`\nBieżący tydzień (od ${w.weekStart}): ${w.sessionCount}/${w.adjustedTarget} sesji (dni chronione ${w.protectedDays}), ${durationLabel(w.minutes)} muzyki. Plan: zrealizowane ${w.fulfilled}, częściowo ${w.partial}, pominięte ${w.skipped}, otwarte ${w.open}, usprawiedliwione ${w.excused}.`);
  for (let i = 1; i <= 3; i++) {
    const pw = weekStats(snap, addDays(weekStart(clock.today), -7 * i), clock.today);
    L.push(`Tydzień od ${pw.weekStart}: ${pw.sessionCount}/${pw.adjustedTarget} sesji, ${durationLabel(pw.minutes)}, stan: ${pw.state}.`);
  }
  const st = streak(snap, clock.today);
  L.push(`Tygodnie z utrzymanym rytmem: ${st.current} z rzędu, najwięcej ${st.best}.`);
  const sp = spontaneousShare(snap, clock.today);
  L.push(`Ostatnie 28 dni: sesje spontaniczne ${sp.spontaneous}, z planu ${sp.planned}.`);
  const ret = returnState(snap, clock.today);
  if (ret.active) L.push(`Trwa przerwa: ${ret.gapDays} dni bez muzyki (dni chronione: ${ret.protectedDays}).`);
  const br = breaks(snap, clock.today).filter((b) => b.returnedOn).slice(0, 3);
  for (const b of br) L.push(`Przerwa ${b.from}–${b.to} (${b.days} dni, chronione ${b.protectedDays}), powrót ${b.returnedOn}.`);

  const recent = alive(snap.sessions).filter((s) => countsAsSession(s) && sessionDate(s, tz) >= addDays(clock.today, -14))
    .sort((a, b) => b.started_at - a.started_at).slice(0, 12);
  L.push('\nOstatnie sesje (14 dni):');
  if (!recent.length) L.push('- brak');
  for (const s of recent) {
    const wf = s.workflow_id ? alive(snap.workflows).find((x) => x.id === s.workflow_id)?.name : null;
    L.push(`- ${sessionDate(s, tz)} o ${hhmm(zoned(s.started_at, tz).minutes)}, ${durationLabel(s.active_seconds / 60)}${wf ? `, workflow „${wf}”` : ''}${s.event_id ? ', z planu' : ', spontaniczna'}.`);
  }

  const ms = misses(snap, clock.today).slice(0, 6);
  if (ms.length) {
    L.push('\nPominięte bloki muzyki (28 dni):');
    for (const m of ms) L.push(`- ${m.date} ${m.title}: ${m.reason === 'capacity' ? 'był wolny czas' : m.reason === 'unwell' ? 'gorszy stan' : 'ciężki dzień'} (${m.detail}).`);
  }

  L.push('\nNajbliższe 7 dni (identyfikatory wydarzeń do propozycji zmian):');
  for (let i = 0; i < 7; i++) {
    const d = addDays(clock.today, i);
    const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
    const blocks = ctx.blocks.filter((b) => b.start < 1440).map((b) => `${b.title} ${hhmm(b.start)}–${hhmm(b.end)}`).join(', ');
    const evs = alive(snap.events).filter((e) => e.date === d && ['music', 'training', 'reading', 'promo'].includes(e.kind))
      .map((e) => `[${e.id}] ${e.title} ${hhmm(e.start_min)}–${hhmm(e.end_min)} (${e.status}${e.lesson_key ? ', nauka' : ''})`).join('; ');
    const wins = ctx.windows.map((x) => `${hhmm(x.start)}–${hhmm(x.end)}`).join(', ');
    L.push(`- ${d}: status ${ctx.status}, tryb ${ctx.mode} (max ${ctx.maxMinutes} min). Obowiązki: ${blocks || 'brak'}. Muzyka/nauka: ${evs || 'brak'}. Wolne okna: ${wins || 'brak'}.`);
  }

  const care = alive(snap.care).filter((c) => c.date >= addDays(clock.today, -14)).sort((a, b) => b.at - a.at).slice(0, 6);
  if (care.length) {
    L.push('\nSamopoczucie (14 dni):');
    for (const c of care) L.push(`- ${c.date}: ${c.signal}${c.until ? ` do ${c.until}` : ''}`);
  }

  const learning = allProgress(snap).filter((x) => x.state !== 'new');
  if (learning.length) {
    L.push('\nAkademia:');
    for (const x of learning) L.push(`- ${x.path.title}: ${x.state}, lekcje ${x.done}/${x.total}${x.next ? `, następna: ${x.next.key}` : ''}.`);
  }
  L.push(...libraryContext(snap));
  const ins = insights(snap, clock.today);
  if (ins.length) {
    L.push('\nObserwacje reguł PULSE:');
    for (const i of ins.slice(0, 5)) L.push(`- [${i.kind === 'observation' ? 'z danych' : 'hipoteza'}] ${i.title}: ${i.body}`);
  }
  return L.join('\n');
}

/** Static catalog description — belongs in the cached system prompt, not the per-turn context. */
export function catalogText(): string {
  return [
    'Akademia (klucz lekcji — tytuł [ścieżka, minuty]):',
    ...PATHS.flatMap((p) => p.lessons.map((l) => `- ${l.key} — ${l.title} [${p.title}, ${l.minutes} min]: ${l.summary}`)),
    '',
    'Katalog książek — jedyne dozwolone pozycje (klucz — tytuł, autor [kategoria; trudność; czas; umiejętności; wydanie polskie]):',
    ...BOOKS.filter((b) => !b.retired).map((b) => `- ${b.key} — ${b.title}, ${b.author} [${CATEGORY_LABEL[b.category]}; ${DIFFICULTY_LABEL[b.difficulty]}; ${hoursLabel(readingHours({ pages: b.pages, catalog_key: b.key }))}; ${b.skills.map((x) => SKILL_LABEL[x]).join(', ')}; PL: ${b.pl === 'orig' ? 'polski oryginał' : b.pl === 'verified' ? 'jest' : b.pl === 'none' ? 'brak' : b.pl === 'unconfirmed' ? 'niepotwierdzone' : 'nie sprawdzano'}${b.verified ? '' : '; dane do sprawdzenia'}]: ${b.learning_goal}`),
  ].join('\n');
}


/** The reading shelf and what the person's own ratings say — so recommendations rest on facts, not guesses. */
export function libraryContext(snap: Snapshot): string[] {
  const books = alive(snap.books);
  if (!books.length) return ['\nBiblioteka: pusta — brak ocen i historii, więc rekomenduj z katalogu według profilu i celów.'];
  const L: string[] = ['\nBiblioteka (półka; statusy jak w aplikacji):'];
  const line = (b: (typeof books)[number]) => {
    const bits = [`[${BOOK_STATUS_LABEL[b.status]}] ${b.title} (${b.author})`];
    if (b.catalog_key) bits.push(`klucz ${b.catalog_key}`);
    if (b.due_date && b.status !== 'read' && b.status !== 'dropped') bits.push(`termin orientacyjny ${b.due_date}`);
    if (b.status === 'read') {
      if (b.rating) bits.push(`ocena ${b.rating}/5`);
      if (b.clarity) bits.push(b.clarity === 'clear' ? 'zrozumiała' : b.clarity === 'partly' ? 'zrozumiała w części' : 'trudna');
      if (b.direction) bits.push(b.direction === 'more' ? 'chce iść dalej w tym kierunku' : b.direction === 'different' ? 'woli coś innego' : 'kierunek nieustalony');
    }
    return `- ${bits.join(', ')}.`;
  };
  const by = (st: string) => books.filter((b) => b.status === st);
  for (const b of [...by('reading'), ...by('bought'), ...by('planned'), ...by('suggested'), ...by('paused')].slice(0, 12)) L.push(line(b));
  const read = by('read').sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0)).slice(0, 8);
  for (const b of read) L.push(line(b));
  const dropped = by('dropped').slice(0, 8);
  if (dropped.length) L.push(`- Odrzucone (nie polecaj ponownie): ${dropped.map((b) => `${b.title}`).join('; ')}.`);
  const t = tasteOf(snap);
  const top = (Object.entries(t.skills) as [Skill, number][]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => SKILL_LABEL[k]);
  L.push(`Wagi preferencji (z profilu i ocen): najwyżej ${top.join(', ')}.${t.recent.length ? ` Ostatnio czytane kategorie: ${t.recent.map((c) => CATEGORY_LABEL[c]).join(', ')} — różnicuj.` : ''}`);
  return L;
}
