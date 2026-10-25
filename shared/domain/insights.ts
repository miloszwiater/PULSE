import { addDays, daysBetween, hhmm, plDate } from '../time';
import { activePaths } from './academy';
import { dayContext, RULES } from './day';
import { alive, type Snapshot } from './snapshot';
import { countsAsSession, sessionDate } from './sessions';
import { breaks, returnState } from './workflow';

export type InsightAction =
  | { type: 'plan_week' }
  | { type: 'return' }
  | { type: 'start'; minutes: number | null }
  | { type: 'lesson'; lesson_key: string }
  | { type: 'profile_patch'; patch: Record<string, unknown>; label: string };

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

/** Why a planned music block did not happen — judged only from data the person entered. */
export type MissReason = 'heavy_day' | 'unwell' | 'capacity';

export interface Miss { date: string; title: string; reason: MissReason; detail: string }

/**
 * Planned music that was skipped or left open in the last N days, each
 * classified by the day it was on: a heavy or unwell day is "couldn't",
 * a day with real free time is "time was there". Neither is a judgement.
 */
export function misses(snap: Snapshot, today: string, days = 28): Miss[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const sessionDays = new Set(alive(snap.sessions).filter(countsAsSession).map((s) => sessionDate(s, tz)));
  const out: Miss[] = [];
  for (const e of alive(snap.events)) {
    if (e.kind !== 'music' || e.lesson_key) continue;
    if (!(e.status === 'skipped' || (e.status === 'planned' && e.date < today))) continue;
    if (daysBetween(e.date, today) > days || sessionDays.has(e.date)) continue;
    const ctx = dayContext(snap, e.date, undefined, { ignoreEventId: e.id });
    let reason: MissReason;
    let detail: string;
    if (ctx.status === 'sick' || ctx.status === 'low' || ctx.status === 'overloaded') { reason = 'unwell'; detail = 'zgłoszony gorszy stan'; }
    else if (ctx.workMinutes >= RULES.longWorkMinutes || ctx.mode === 'none' || ctx.mode === 'light') { reason = 'heavy_day'; detail = `${Math.round(ctx.workMinutes / 60)} h pracy i dojazdów`; }
    else { reason = 'capacity'; detail = `wolne okno ${ctx.windows.map((w) => `${hhmm(w.start)}–${hhmm(w.end)}`).slice(0, 1).join('') || '—'}`; }
    out.push({ date: e.date, title: e.title, reason, detail });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Rule-based observations. They work without any AI provider and are the
 * evidence the AI companion receives. Every insight lists its evidence and
 * none of them grades the music itself.
 */
export function insights(snap: Snapshot, today: string): Insight[] {
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const out: Insight[] = [];
  const counted = alive(snap.sessions).filter(countsAsSession);

  // 1. Return after a break
  const ret = returnState(snap, today);
  if (ret.active && counted.length > 0) {
    const protectedMost = ret.protectedDays >= ret.gapDays / 2;
    out.push({
      key: 'return', kind: 'observation', priority: 1,
      title: `${ret.gapDays} dni bez muzyki`,
      body: protectedMost
        ? 'Większość tej przerwy to choroba, urlop albo dni wolne — to nie jest zaległość. Powrót może zacząć się od krótkiej sesji bez planu.'
        : 'Nic nie trzeba nadrabiać. Najłatwiej wrócić krótką sesją — 20–30 minut na czymkolwiek, co już jest zaczęte. Mogę ułożyć lekki plan powrotu.',
      evidence: [ret.lastSession ? `ostatnia sesja: ${plDate(ret.lastSession)}` : 'brak sesji', `dni chronione w przerwie: ${ret.protectedDays}`],
      action: { type: 'return' },
    });
  }

  // 2. Couldn't vs time was there
  const m = misses(snap, today);
  const capacity = m.filter((x) => x.reason === 'capacity');
  const heavy = m.filter((x) => x.reason === 'heavy_day' || x.reason === 'unwell');
  if (capacity.length >= 2) {
    out.push({
      key: 'start-threshold', kind: 'hypothesis', priority: 2,
      title: 'Czas był, start nie przyszedł',
      body: 'Kilka zaplanowanych bloków przepadło w dni, w których był wolny czas i nie było zgłoszonego zmęczenia. To częsty mechanizm i nie świadczy o braku zapału — zwykle przeszkodą jest próg wejścia. Pomaga krótszy start: 25 minut zamiast pełnej sesji, z decyzją o przedłużeniu dopiero w trakcie.',
      evidence: capacity.slice(0, 4).map((x) => `${plDate(x.date)}: ${x.title} — ${x.detail}`),
      action: { type: 'start', minutes: 25 },
    });
  }
  if (heavy.length >= 2) {
    out.push({
      key: 'heavy-days', kind: 'observation', priority: 2,
      title: 'Plan trafiał na ciężkie dni',
      body: 'Pominięte bloki wypadały w dni długiej pracy albo gorszego samopoczucia. To realny brak możliwości, nie brak dyscypliny. Lepiej, żeby plan omijał takie dni — PULSE robi to automatycznie przy generowaniu, ale bloki dodane ręcznie warto przesunąć.',
      evidence: heavy.slice(0, 4).map((x) => `${plDate(x.date)}: ${x.title} — ${x.detail}`),
      action: { type: 'plan_week' },
    });
  }

  // 3. Bursts and long breaks
  const longOnes = counted.filter((s) => s.active_seconds >= RULES.longSessionMinutes * 60 && daysBetween(sessionDate(s, tz), today) <= 60);
  const recentBreaks = breaks(snap, today).filter((b) => b.returnedOn && daysBetween(b.returnedOn, today) <= 60 && b.protectedDays < b.days / 2);
  if (longOnes.length >= 2 && recentBreaks.length >= 2) {
    out.push({
      key: 'bursts', kind: 'hypothesis', priority: 3,
      title: 'Zrywy i przerwy',
      body: 'W ostatnich dwóch miesiącach pojawiły się długie sesje i dłuższe przerwy bez muzyki. Długie noce są wartościowe; rytm łatwiej utrzymać, gdy między nimi są też krótkie, zwykłe sesje.',
      evidence: [`sesje ≥ ${RULES.longSessionMinutes / 60} h: ${longOnes.length}`, ...recentBreaks.slice(0, 2).map((b) => `przerwa ${b.days} dni (${plDate(b.from)}–${plDate(b.to)})`)],
    });
  }

  // 4. Energy signals
  const care7 = alive(snap.care).filter((c) => daysBetween(c.date, today) <= 7 && (c.signal === 'low' || c.signal === 'overloaded'));
  if (care7.length >= 3 && (snap.profile?.weekly_session_target ?? 0) > 1) {
    const t = snap.profile!.weekly_session_target;
    out.push({
      key: 'energy-load', kind: 'hypothesis', priority: 1,
      title: 'Obciążenie jest za wysokie',
      body: `W ostatnim tygodniu ${care7.length} razy pojawił się brak energii albo przeciążenie. Muzyka ma być częścią życia na długo, więc warto chwilowo zmniejszyć rytm.`,
      evidence: care7.map((c) => `${plDate(c.date)}: ${c.signal === 'low' ? 'brak energii' : 'przeciążenie'}`),
      action: { type: 'profile_patch', patch: { weekly_session_target: t - 1 }, label: `Rytm: ${t} → ${t - 1} sesji tygodniowo` },
    });
  }

  // 5. Learning paths left aside (information, not pressure)
  for (const p of activePaths(snap)) {
    const last = p.lastOpenedAt ? new Date(p.lastOpenedAt).toISOString().slice(0, 10) : null;
    if (!last || daysBetween(last, today) < 21 || !p.next) continue;
    out.push({
      key: `path-${p.path.key}`, kind: 'observation', priority: 4,
      title: `${p.path.title}: odłożone`,
      body: `Ścieżka stoi od ${daysBetween(last, today)} dni. Można wrócić do lekcji „${p.next.title}” albo wstrzymać ścieżkę — postęp zostaje.`,
      evidence: [`ukończone lekcje: ${p.done}/${p.total}`, `ostatnio otwarta: ${plDate(last)}`],
      action: { type: 'lesson', lesson_key: p.next.key },
    });
  }

  // 6. A regular week deserves a plain statement, not a trophy
  const last14 = counted.filter((s) => daysBetween(sessionDate(s, tz), today) <= 13);
  if (!out.length && last14.length >= 4) {
    const days = new Set(last14.map((s) => sessionDate(s, tz))).size;
    out.push({
      key: 'steady', kind: 'observation', priority: 5,
      title: 'Rytm się trzyma',
      body: `W ostatnich 14 dniach muzyka pojawiła się w ${days} różnych dniach.`,
      evidence: [`sesje: ${last14.length}`, `od ${plDate(addDays(today, -13))}`],
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}
