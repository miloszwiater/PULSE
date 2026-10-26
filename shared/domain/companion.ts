/**
 * Local companion: understands common Polish messages about work, energy,
 * illness, inspiration, learning and returning — without any AI provider.
 * It never changes data by itself: it answers and offers actions; every
 * change to the plan is a Proposal the person approves.
 */
import { PATH_BY_KEY, type PathKey } from '../catalog/academy';
import { careSchema, dayStateSchema, eventSchema, routineExceptionSchema, type CareCheckin, type MentorMessage, type PEvent, type Proposal } from '../schema';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, PL_LABEL } from '../catalog/books';
import { addDays, durationLabel, hhmm, plDate, weekday } from '../time';
import { nextLessonToSuggest, pathProgress } from './academy';
import { dayContext, RULES } from './day';
import { BOOK_STATUS_LABEL, deadlineShiftProposal, hoursLabel, readingHours, recommendBooks } from './library';
import { closeStaleProposal, detectConflicts, generateMonthPlan, generateWeekPlan, resolveConflicts } from './planner';
import { alive, newId, type Clock, type Snapshot } from './snapshot';
import { returnState } from './workflow';

export type Intent =
  | 'sick' | 'work_change' | 'move_music' | 'low_energy' | 'inspired' | 'learn'
  | 'return' | 'day_free' | 'plan_week' | 'plan_month' | 'book' | 'book_shift' | 'thanks' | 'unknown';

/**
 * Serializable action shown as a button under the reply (stored in
 * mentor_messages.cards as {type:'action', id, title}).
 *   care:<signal>[:<days>]   record a wellbeing signal
 *   start[:<minutes>]        start a Creative Workflow session
 *   open:<path>              navigate
 *   path:<key>               start a learning path
 *   day:<status>:<date>      set the day status (off = free from plan)
 */
export interface CompanionAction { id: string; label: string }

export interface CompanionReply {
  intent: Intent;
  text: string;
  proposal: Proposal | null;
  /** Rows to commit together with the proposal when "apply" is chosen (e.g. the care signal it depends on). */
  actions: CompanionAction[];
  /** Cards shown under the reply (catalog books). */
  cards?: MentorMessage['cards'];
  /** Leave this message to the AI when it is available: the local answer is only the fallback. */
  defer?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const WEEKDAYS: [RegExp, number][] = [
  [/poniedzia[łl]/, 0], [/wtor/, 1], [/[śs]rod/, 2], [/czwart/, 3], [/pi[ąa]t/, 4], [/sobot/, 5], [/niedziel/, 6],
];

/** "dziś", "jutro", "pojutrze", weekday names → a date (the next such day, today included). */
export function parseDay(text: string, today: string): string | null {
  const t = norm(text);
  if (/pojutrze/.test(t)) return addDays(today, 2);
  if (/jutr/.test(t)) return addDays(today, 1);
  if (/dzi[śs]|dzisiaj|teraz|wiecz[oó]r/.test(t)) return today;
  for (const [re, wd] of WEEKDAYS) {
    if (re.test(t)) {
      const diff = (wd - weekday(today) + 7) % 7;
      return addDays(today, diff);
    }
  }
  return null;
}

const NUM_WORDS: Record<string, number> = { jeden: 1, jedna: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, pięć: 5, piec: 5, sześć: 6, szesc: 6, siedem: 7, osiem: 8, dziewięć: 9, dziesięć: 10, dwanaście: 12 };

function num(token: string): number | null {
  if (/^\d+([.,]\d+)?$/.test(token)) return Number(token.replace(',', '.'));
  return NUM_WORDS[token] ?? null;
}

/** "12 godzin", "10h", "osiem godzin" */
export function parseHours(text: string): number | null {
  for (const m of norm(text).matchAll(/(\d+(?:[.,]\d+)?|\p{L}+)\s*(?:h(?!\p{L})|godz)/gu)) {
    const n = num(m[1]);
    if (n != null && n > 0 && n <= 24) return n;
  }
  return null;
}

/** "od 8 do 20", "8-20", "8:00–20:30" */
export function parseRange(text: string): { start: number; end: number } | null {
  const m = /(?:od\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:-|–|do)\s*(\d{1,2})(?::(\d{2}))?/.exec(norm(text));
  if (!m) return null;
  const a = Number(m[1]) * 60 + Number(m[2] ?? 0);
  let b = Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (Number(m[1]) > 23 || Number(m[3]) > 23) return null;
  if (b <= a) b += 1440;
  return { start: a, end: b };
}

/** "przez 3 dni", "kilka dni", "tydzień" */
export function parseDays(text: string): number | null {
  const t = norm(text);
  if (/tydzie[ńn]|tygodni/.test(t)) return 7;
  if (/kilka dni|par[eę] dni/.test(t)) return 3;
  const m = /(\d+|\p{L}+)\s*dni/u.exec(t);
  if (m) { const n = num(m[1]); if (n && n <= 30) return n; }
  return null;
}

export function detectIntent(text: string): Intent {
  const t = norm(text);
  if (/chor(y|a|uj|oba)|gor[ąa]cz|przezi[ęe]bi|gryp|infekc|zatru|covid|anginy?\b|boli mnie gard/.test(t)) return 'sick';
  // Reading deadlines are asked about before work: "przesuń termin książki, bo mam dużo w pracy" is about the book.
  if (/ksi[ąa][żz]k|czytan|lektur/.test(t) && /termin|przesu[ńn]|prze[łl][óo][żz]|nie zd[aą][żz]|brak czasu|nie mam czasu/.test(t)) return 'book_shift';
  if (/(pracuj|w pracy|zmian[aęy]|dy[żz]ur|nadgodzin|grafik)/.test(t) && !/nie pracuj/.test(t)) return 'work_change';
  if (/(mam|bior[ęe]) (jutro |dzi[śs] |w \p{L}+ )?wolne|dzie[ńn] wolny|nie pracuj/u.test(t)) return 'day_free';
  if (/(prze[łl][óo][żz]|przesu[ńn]|przenie[śs]|odwo[łl]aj).*(muzyk|sesj|studio|nagr|plan)/.test(t)) return 'move_music';
  if (/nie mam (dzi[śs] |dzisiaj )?(energii|si[łl])|zm[ęe]czon|wyczerpan|padam|wypalon|zjechan|s[łl]abo si[ęe] czuj|bez energii|kiepski dzie[ńn]|przeci[ąa][żz]on/.test(t)) return 'low_energy';
  if (/od dawna|dawno nie|wr[óo]ci[ćc]|powr[óo]t|zacz[ąa][ćc] od nowa|zastoj|przerw[aęy] od muzyki/.test(t)) return 'return';
  if (/ksi[ąa][żz]k|lektur|czyta[ćc]|do czytania|(skończy|przeczyta|ukończy)[łl]\w* /.test(t)) return 'book';
  if (/(pouczy|nauczy|uczy[ćc]|nauk[aęi]|lekcj|poćwicz|pocwicz|podszkoli)/.test(t)) return 'learn';
  if (/\bwen[aęy]?\b|chc[ęe] (tworzy|nagrywa|pisa|robi[ćc] muzyk)|natchn|mam flow|mam pomys[łl]|mam ochot[ęe] (na muzyk|tworzy|nagrywa)/.test(t)) return 'inspired';
  if (/plan.*miesi[ąa]c|miesi[ąa]c.*plan|zaplanuj miesi/.test(t)) return 'plan_month';
  if (/zaplanuj|u[łl][óo][żz] plan|plan na tydzie[ńn]|plan tygodnia/.test(t)) return 'plan_week';
  if (/^(dzi[ęe]ki|dzi[ęe]kuj|ok\b|okej|super)/.test(t)) return 'thanks';
  return 'unknown';
}

export function detectPath(text: string): PathKey | null {
  const t = norm(text);
  if (/[śs]piew|wokal|g[łl]os|intonac|oddech|emisj/.test(t)) return 'vocal';
  if (/teori|harmoni|akord|skal|tonacj|interwa|nut/.test(t)) return 'theory';
  if (/flow|frazow|rytm/.test(t)) return 'flow';
  if (/tekst|pisa|songwrit|metafor|refren|liryk/.test(t)) return 'writing';
  if (/analiz|s[łl]ucha/.test(t)) return 'analysis';
  return null;
}

const dayLabel = (d: string, today: string) => (d === today ? 'dziś' : d === addDays(today, 1) ? 'jutro' : plDate(d));

function withCare(snap: Snapshot, row: CareCheckin): Snapshot {
  return { ...snap, care: [...snap.care, row] };
}

function conflictsOn(snap: Snapshot, clock: Clock, from: string, to: string) {
  return detectConflicts(snap, clock).filter((c) => c.event.date >= from && c.event.date <= to);
}

/** A proposal that also carries rows it depends on (care signal, work block) as its first changes. */
function bundle(base: Proposal | null, extra: Proposal['changes'], title: string, rationale: string, now: number): Proposal | null {
  if (!base && !extra.length) return null;
  const id = base?.id ?? newId('pr');
  return {
    id, updated_at: now, deleted_at: null, source: 'mentor', status: 'pending', decided_at: null,
    title, rationale: [rationale, base?.rationale].filter(Boolean).join('\n'),
    changes: [...extra, ...(base?.changes ?? [])],
  };
}

export function understand(text: string, snap: Snapshot, clock: Clock, opts: { aiAvailable?: boolean } = {}): CompanionReply {
  const intent = detectIntent(text);
  const now = clock.nowMs;
  const today = clock.today;
  const reply = (r: Omit<CompanionReply, 'intent'>): CompanionReply => ({ intent, ...r });

  switch (intent) {
    case 'sick': {
      const days = parseDays(text) ?? (/dzi[śs]|dzisiaj/.test(norm(text)) ? 1 : 3);
      const from = parseDay(text, today) ?? today;
      const care = careSchema.parse({ id: newId('ca'), updated_at: now, at: now, date: from, signal: 'sick', until: addDays(from, days - 1), note: text.slice(0, 300) });
      const work = withCare(snap, care);
      const conf = conflictsOn(work, clock, from, addDays(from, days - 1));
      const fix = resolveConflicts(work, clock, conf, { title: 'Choroba — plan bez muzyki' });
      const voice = /gard[łl]|g[łl]os|chryp/.test(norm(text));
      const lines = [
        `Zapisuję chorobę na ${days === 1 ? 'dziś' : `${days} dni (do ${plDate(addDays(from, days - 1))})`} — to powód, nie porażka. Te dni są chronione: rytm się nie urywa i nic nie trzeba nadrabiać.`,
        conf.length ? `W tym czasie ${conf.length === 1 ? 'był zaplanowany 1 blok' : `było zaplanowanych ${conf.length} bloków`} — proponuję je odpuścić albo przesunąć na dni po chorobie.` : 'W tym czasie nie było zaplanowanej muzyki.',
        voice ? 'Oszczędzaj głos — śpiewanie poczeka.' : '',
        'Nie oceniam objawów. Jeśli jest gorzej albo stan się przedłuża, skontaktuj się z lekarzem.',
      ].filter(Boolean);
      const shift = deadlineShiftProposal(snap, clock, { days: days + 3, reason: 'sick' });
      if (shift) lines.splice(2, 0, `Terminy czytania (${shift.changes.length}) też mogą poczekać — dołożyłem ich przesunięcie do tej samej propozycji.`);
      const proposal = bundle(fix, [{ entity: 'care', before: null, after: care as unknown as Record<string, unknown>, label: `Choroba: ${plDate(from)}${days > 1 ? ` – ${plDate(addDays(from, days - 1))}` : ''}` }, ...(shift?.changes ?? [])],
        'Choroba — plan bez muzyki', `Zgłoszona choroba${days > 1 ? ` na ${days} dni` : ''}.`, now);
      return reply({ text: lines.join(' '), proposal, actions: [] });
    }

    case 'work_change': {
      const date = parseDay(text, today) ?? addDays(today, 1);
      const hours = parseHours(text);
      const range = parseRange(text);
      const ctx0 = dayContext(snap, date);
      const routineWork = ctx0.blocks.find((b) => b.kind === 'work' && b.routine_id);
      let start: number;
      let end: number;
      if (range) { start = range.start; end = range.end; }
      else if (hours) { start = routineWork?.start ?? 8 * 60; end = start + Math.round(hours * 60); }
      else {
        return reply({
          text: `Rozumiem, że ${dayLabel(date, today)} zmienia się praca. Napisz godziny (np. „${dayLabel(date, today)} pracuję 8–20”) albo liczbę godzin — wtedy przeliczę plan muzyki.`,
          proposal: null, actions: [{ id: 'open:/plan', label: 'Otwórz plan' }],
        });
      }
      end = Math.min(end, 2160);
      const changes: Proposal['changes'] = [];
      if (routineWork?.routine_id) {
        const ex = routineExceptionSchema.parse({ id: `rx_${routineWork.routine_id}_${date}`, updated_at: now, routine_id: routineWork.routine_id, date });
        changes.push({ entity: 'routine_exceptions', before: null, after: ex as unknown as Record<string, unknown>, label: `${plDate(date)}: stały grafik „${routineWork.title}” zastąpiony` });
      }
      const workEv = eventSchema.parse({ id: newId('ev'), updated_at: now, kind: 'work', title: 'Praca', date, start_min: start, end_min: end, source: 'mentor', flexible: false });
      changes.push({ entity: 'events', before: null, after: workEv as unknown as Record<string, unknown>, label: `${plDate(date)}: praca ${hhmm(start)}–${hhmm(end)}` });
      let work: Snapshot = { ...snap, events: [...snap.events, workEv] };
      if (routineWork?.routine_id) work = { ...work, routine_exceptions: [...work.routine_exceptions, routineExceptionSchema.parse({ id: `rx_${routineWork.routine_id}_${date}`, updated_at: now, routine_id: routineWork.routine_id, date })] };
      const wantsMove = /prze[łl][óo][żz]|przesu[ńn]|przenie[śs]|nie dam rady|nie zd[ąa][żz]/.test(norm(text));
      let conf = conflictsOn(work, clock, date, date);
      if (wantsMove) {
        const music = alive(snap.events).filter((e) => e.date === date && e.status === 'planned' && (e.kind === 'music' || e.kind === 'training'));
        for (const e of music) if (!conf.some((c) => c.event.id === e.id)) conf.push({ event: e, type: 'day_status', reason: 'Prośba o przełożenie.' });
        conf = conf.map((c) => ({ ...c, type: 'day_status' as const }));
      }
      const fix = resolveConflicts(work, clock, conf, { preferMove: true });
      const ctx = dayContext(work, date);
      const h = Math.round(((end - start) / 60) * 10) / 10;
      const lines = [`Dodaję ${dayLabel(date, today)} pracę ${hhmm(start)}–${hhmm(end)} (${String(h).replace('.', ',')} h).`];
      if (conf.length) lines.push(`${conf.length === 1 ? 'Muzyka z tego dnia' : `${conf.length} bloki muzyki z tego dnia`} — ${wantsMove ? 'przekładam' : 'nie mieszczą się, więc przekładam'} na najbliższy dzień z realnym czasem.`);
      else lines.push('Na ten dzień nie było muzyki, więc plan się nie zmienia.');
      if (ctx.workMinutes >= RULES.heavyWorkMinutes) lines.push('Po takim dniu PULSE nic nie dokłada — co najwyżej coś bardzo lekkiego, jeśli przyjdzie ochota.');
      lines.push('Zatwierdź, żeby zapisać zmiany.');
      return reply({ text: lines.join(' '), proposal: bundle(fix, changes, `Praca ${plDate(date)}: ${hhmm(start)}–${hhmm(end)}`, 'Zmiana w pracy zgłoszona w rozmowie.', now), actions: [] });
    }

    case 'move_music': {
      const date = parseDay(text, today) ?? today;
      const music = alive(snap.events).filter((e) => e.date === date && e.status === 'planned' && (e.kind === 'music' || e.kind === 'training'));
      if (!music.length) return reply({ text: `${dayLabel(date, today)[0].toUpperCase()}${dayLabel(date, today).slice(1)} nie ma zaplanowanej muzyki — nie ma czego przekładać.`, proposal: null, actions: [{ id: 'open:/plan', label: 'Otwórz plan' }] });
      const fix = resolveConflicts(snap, clock, music.map((e) => ({ event: e, type: 'day_status' as const, reason: 'Prośba o przełożenie.' })), { preferMove: true, title: `Przełożenie muzyki z ${plDate(date)}` });
      return reply({ text: `Przekładam ${music.length === 1 ? 'blok' : `${music.length} bloki`} z ${plDate(date)} na najbliższe dni z wolnym czasem, bez dokładania dwóch sesji w jeden dzień. Jeśli nic się nie mieści w tygodniu, blok zostaje odpuszczony bez kary.`, proposal: fix, actions: [] });
    }

    case 'low_energy': {
      const care = careSchema.parse({ id: newId('ca'), updated_at: now, at: now, date: today, signal: 'low', note: text.slice(0, 300) });
      const work = withCare(snap, care);
      const fix = resolveConflicts(work, clock, conflictsOn(work, clock, today, today));
      const evToday = alive(snap.events).filter((e) => e.date === today && e.status === 'planned' && (e.kind === 'music' || e.kind === 'training'));
      const lines = [
        'Najpierw podstawy: woda, coś do zjedzenia, chwila bez ekranu. Jeśli to możliwe — wcześniejszy sen.',
        'Jeśli mimo to masz ochotę na muzykę, coś lekkiego: posłuchać płyty, która Cię inspiruje, przejrzeć notatki w projekcie albo 5 minut rozgrzewki ze słomką. Albo nic — odpoczynek też jest częścią rytmu.',
        evToday.length ? `Dzisiejszy plan (${evToday.map((e) => `${e.title} ${hhmm(e.start_min)}`).join(', ')}) mogę odciążyć.` : '',
      ].filter(Boolean);
      return reply({
        text: lines.join(' '),
        proposal: bundle(fix, [{ entity: 'care', before: null, after: care as unknown as Record<string, unknown>, label: 'Dziś: mało energii' }], 'Dzień z mniejszą energią', 'Zgłoszony brak energii.', now),
        actions: [{ id: 'start:15', label: 'Lekko: 15 minut' }],
      });
    }

    case 'inspired': {
      const ctx = dayContext(snap, today, clock);
      const next = ctx.blocks.filter((b) => b.start > clock.nowMin && b.start < 1440).sort((a, b) => a.start - b.start)[0];
      const planned = ctx.commitments.find((e) => e.kind === 'music' && !e.lesson_key);
      const lines = ['Korzystaj z tego. Sesja startuje od razu — bez ustawień i bez formularzy.'];
      if (next) lines.push(`Masz czas do ${hhmm(next.start)} (${next.title.toLowerCase()}), czyli ok. ${durationLabel(next.start - clock.nowMin)}.`);
      if (planned) lines.push(`Ta sesja zaliczy też zaplanowany blok z ${hhmm(planned.start_min)}, jeśli potrwa wystarczająco długo.`);
      if (ctx.status === 'low' || ctx.status === 'overloaded') lines.push('Wcześniej było zgłoszone zmęczenie — słuchaj ciała, sesję można przerwać w każdej chwili.');
      return reply({ text: lines.join(' '), proposal: null, actions: [{ id: 'start', label: 'Zacznij sesję' }, { id: 'start:focus', label: 'Zacznij w trybie skupienia' }] });
    }

    case 'learn': {
      const key = detectPath(text) ?? nextLessonToSuggest(snap)?.path ?? null;
      if (!key) {
        return reply({ text: 'Akademia ma pięć ścieżek: technika wokalna, teoria muzyki, flow i frazowanie, songwriting, analiza utworów. Napisz, czego chcesz się uczyć, albo wybierz ścieżkę.', proposal: null, actions: [{ id: 'open:/nauka', label: 'Otwórz Akademię' }] });
      }
      const path = PATH_BY_KEY[key];
      const prog = pathProgress(snap, key);
      const lesson = prog.next ?? path.lessons[0];
      const count = /tym tygodniu|w tygodniu/.test(norm(text)) ? 2 : 1;
      const proposal = planLearning(snap, clock, key, lesson.key, count);
      const lines = [
        `${path.title}: ${prog.state === 'new' ? 'zaczynamy od lekcji' : 'następna lekcja to'} „${lesson.title}” (ok. ${lesson.minutes} min). ${lesson.summary}`,
        proposal ? `Mogę wstawić ${proposal.changes.length === 1 ? 'jeden blok nauki' : `${proposal.changes.length} bloki nauki`} w wolne okna tego tygodnia — opcjonalnie, bez liczenia jako zaległość.` : 'W tym tygodniu nie ma już okna na naukę, które nie zabierałoby odpoczynku — lekcję można otworzyć w dowolnej chwili.',
      ];
      return reply({ text: lines.join(' '), proposal, actions: [{ id: `open:/nauka/${key}/${lesson.key}`, label: 'Otwórz lekcję' }] });
    }

    case 'return': {
      const ret = returnState(snap, today);
      const plan = planReturn(snap, clock);
      const stale = closeStaleProposal(snap, clock);
      const lines = [
        ret.active ? `Ostatnia sesja była ${ret.lastSession ? plDate(ret.lastSession) : 'dawno'} — ${ret.gapDays} dni temu.` : 'Wracamy spokojnie.',
        'Nic nie trzeba nadrabiać i nic nie jest „zaległe”. Powrót najłatwiej zacząć od czegoś małego: 20 minut z beatem albo projektem, który już istnieje — bez celu, żeby coś skończyć.',
        plan ? `Proponuję ${plan.changes.length} krótkie sesje w najbliższym tygodniu, z dniem przerwy między nimi.` : 'W najbliższym tygodniu grafik jest ciasny — zacznij, kiedy pojawi się okno.',
        stale ? `W planie zostało ${stale.changes.length} starych bloków z przeszłości — mogę je zamknąć bez kary.` : '',
      ].filter(Boolean);
      const merged = plan && stale ? bundle(plan, stale.changes.map((c) => ({ ...c, after: { ...c.after, proposal_id: plan.id } })), 'Plan powrotu', 'Powrót po przerwie.', now) : (plan ?? stale);
      return reply({ text: lines.join(' '), proposal: merged, actions: [{ id: 'start:20', label: 'Zacznij teraz 20 minut' }] });
    }

    case 'day_free': {
      const date = parseDay(text, today) ?? addDays(today, 1);
      const ctx = dayContext(snap, date);
      const routines = ctx.blocks.filter((b) => b.kind === 'work' && b.routine_id);
      const changes: Proposal['changes'] = routines.map((b) => {
        const ex = routineExceptionSchema.parse({ id: `rx_${b.routine_id}_${date}`, updated_at: now, routine_id: b.routine_id!, date });
        return { entity: 'routine_exceptions', before: null, after: ex as unknown as Record<string, unknown>, label: `${plDate(date)}: bez pracy („${b.title}”)` };
      });
      const proposal = changes.length ? bundle(null, changes, `${plDate(date)} bez pracy`, 'Dzień wolny od pracy zgłoszony w rozmowie.', now) : null;
      return reply({
        text: `${dayLabel(date, today)[0].toUpperCase()}${dayLabel(date, today).slice(1)} bez pracy.${changes.length ? ' Zdejmę z tego dnia stały grafik.' : ''} To może być dzień na dłuższą muzykę albo na odpoczynek — decyzja należy do Ciebie.`,
        proposal,
        actions: [{ id: `day:off:${date}`, label: 'Dzień wolny od planu' }, { id: 'open:/plan?gen=1', label: 'Zaplanuj muzykę' }],
      });
    }

    case 'plan_week': {
      const plan = generateWeekPlan(snap, clock);
      return reply({
        text: plan.proposal ? `Plan na resztę tygodnia: ${plan.proposal.changes.length} ${plan.proposal.changes.length === 1 ? 'blok' : 'bloki'}. ${plan.proposal.rationale}` : `Nie dokładam nic: ${plan.notes.find((n) => !n.planned)?.text ?? 'rytm tygodnia jest pokryty.'}`,
        proposal: plan.proposal, actions: [],
      });
    }

    case 'plan_month': {
      const m = generateMonthPlan(snap, clock);
      return reply({ text: m.proposal ? m.proposal.rationale : 'Do końca miesiąca nie ma czego dokładać — plan i grafik się zgadzają.', proposal: m.proposal, actions: [] });
    }

    case 'book_shift': {
      const days = parseDays(text) ?? 14;
      const proposal = deadlineShiftProposal(snap, clock, { days, reason: 'busy' });
      return reply({
        text: proposal
          ? `Terminy czytania to tylko orientacja. Proponuję przesunąć ${proposal.changes.length === 1 ? 'jeden' : proposal.changes.length} o ${days} ${days === 1 ? 'dzień' : 'dni'} — nic się nie zmieni, dopóki nie zatwierdzisz.`
          : 'Nie ma teraz książki z bliskim terminem do przesunięcia. Termin każdej książki można zmienić w Bibliotece.',
        proposal, actions: proposal ? [] : [{ id: 'open:/nauka/ksiazki', label: 'Otwórz Bibliotekę' }],
      });
    }

    case 'book': {
      const t = norm(text);
      if (/(skończy|przeczyta|ukończy)[łl]/.test(t)) {
        const reading = alive(snap.books).filter((b) => b.status === 'reading');
        return reply({
          text: `${reading.length === 1 ? `Oznacz „${reading[0].title}” jako ukończoną` : 'Oznacz książkę jako ukończoną'} na półce — zapytam o trzy rzeczy (opcjonalnie): jak bardzo się podobała, czy była zrozumiała i czy iść dalej w podobnym kierunku. Na tej podstawie zaproponuję następną.`,
          proposal: null, actions: [{ id: 'open:/nauka/ksiazki', label: 'Otwórz półkę' }],
        });
      }
      // With AI available the question goes to the literary advisor, which sees the whole shelf and profile.
      if (opts.aiAvailable) return reply({ text: '', proposal: null, actions: [], defer: true });
      const recs = recommendBooks(snap, { limit: 2, light: /l[eż]k|prost|krótk|latwo|łatwo/.test(t) });
      if (!recs.length) return reply({ text: 'Cały katalog jest już na Twojej półce.', proposal: null, actions: [{ id: 'open:/nauka/ksiazki', label: 'Otwórz półkę' }] });
      const lines = recs.map((r) => `„${r.book.title}” — ${r.book.author} (${CATEGORY_LABEL[r.book.category].toLowerCase()}, ${DIFFICULTY_LABEL[r.book.difficulty]}, ${hoursLabel(readingHours({ pages: r.book.pages, catalog_key: r.book.key }))}; ${PL_LABEL[r.book.pl]}).`);
      const reading = alive(snap.books).filter((b) => b.status === 'reading').length;
      return reply({
        text: `Z katalogu, według tego, co rozwijasz i co już oceniono:\n- ${lines.join('\n- ')}\n${reading >= 2 ? `Masz już ${BOOK_STATUS_LABEL.reading.toLowerCase()} ${reading} pozycje — nowa może poczekać.` : 'Lektura niczego nie obiecuje — to materiał do czerpania.'}`,
        proposal: null, actions: [{ id: 'open:/nauka/ksiazki', label: 'Otwórz Bibliotekę' }],
        cards: recs.map((r) => ({ type: 'book' as const, id: r.book.key, why: r.why })),
      });
    }

    case 'thanks':
      return reply({ text: 'Jestem tu, gdy coś się zmieni.', proposal: null, actions: [] });

    default:
      return reply({
        text: opts.aiAvailable
          ? ''
          : 'Tę wiadomość rozumiem tylko częściowo — pełna rozmowa wymaga skonfigurowanego AI (klucz po stronie serwera). Bez niego rozumiem m.in.: „Jutro pracuję 12 godzin, przełóż muzykę”, „Nie mam dziś energii”, „Jestem chory przez kilka dni”, „Mam wenę”, „Chcę się pouczyć śpiewu”, „Pomóż mi wrócić”, „Zaplanuj tydzień”.',
        proposal: null, actions: [],
      });
  }
}

/** Optional learning blocks for the rest of the week (never on a day that already has music). */
export function planLearning(snap: Snapshot, clock: Clock, path: PathKey, lessonKey: string, count: number): Proposal | null {
  const lesson = PATH_BY_KEY[path].lessons.find((l) => l.key === lessonKey)!;
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  const used = new Set<string>();
  for (let i = 0; i < 7 && changes.length < count; i++) {
    const d = addDays(clock.today, i);
    if (weekday(d) < weekday(clock.today) && i > 0) break; // stay in this week
    const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
    if (ctx.mode !== 'normal' && ctx.mode !== 'long') continue;
    if (ctx.commitments.some((e) => e.kind === 'music' || e.kind === 'training') || used.has(d)) continue;
    const len = Math.max(30, Math.ceil(Math.min(lesson.minutes, 60) / 15) * 15);
    const w = ctx.windows.find((x) => x.end - x.start >= len);
    if (!w || ctx.remainingMinutes < len) continue;
    const start = Math.ceil(w.start / 15) * 15;
    const ev = eventSchema.parse({ id: newId('ev'), updated_at: clock.nowMs, kind: 'training', title: `Nauka: ${lesson.title}`, lesson_key: lesson.key, date: d, start_min: start, end_min: start + len, priority: 3, source: 'mentor', proposal_id: pid, notes: 'Opcjonalna nauka z Akademii.' });
    changes.push({ entity: 'events', before: null, after: ev as unknown as Record<string, unknown>, label: `${plDate(d)} ${hhmm(start)}–${hhmm(start + len)} · ${ev.title}` });
    used.add(d);
  }
  if (!changes.length) return null;
  return { id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'mentor', status: 'pending', decided_at: null, title: `Nauka: ${PATH_BY_KEY[path].title}`, rationale: 'Bloki nauki są opcjonalne — pominięcie nie wpływa na rytm.', changes };
}

/** Return plan: up to three 30-minute sessions in the next 7 days, never on consecutive days. */
export function planReturn(snap: Snapshot, clock: Clock): Proposal | null {
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  let lastDay: string | null = null;
  for (let i = 0; i < 7 && changes.length < 3; i++) {
    const d = addDays(clock.today, i);
    if (lastDay && addDays(lastDay, 1) === d) continue;
    const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
    if (ctx.mode === 'none' || ctx.remainingMinutes < 30) continue;
    if (ctx.commitments.some((e) => e.kind === 'music')) { lastDay = d; continue; }
    const w = ctx.windows.find((x) => x.end - x.start >= 30);
    if (!w) continue;
    const start = Math.ceil(Math.max(w.start, Math.min(w.end - 30, 18 * 60)) / 15) * 15;
    if (start + 30 > w.end) continue;
    const ev: PEvent = eventSchema.parse({ id: newId('ev'), updated_at: clock.nowMs, kind: 'music', title: 'Krótki powrót do muzyki', date: d, start_min: start, end_min: start + 30, priority: 3, source: 'mentor', proposal_id: pid, notes: 'Bez nadrabiania — wystarczy usiąść i zacząć.' });
    changes.push({ entity: 'events', before: null, after: ev as unknown as Record<string, unknown>, label: `${plDate(d)} ${hhmm(start)}–${hhmm(start + 30)} · ${ev.title}` });
    lastDay = d;
  }
  if (!changes.length) return null;
  return { id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'mentor', status: 'pending', decided_at: null, title: 'Plan powrotu', rationale: 'Mało i krótko: rytm wraca przez powtarzalność, nie przez długie sesje.', changes };
}

/** Day-status row builder for the `day:` action. */
export function dayStatusRow(date: string, status: 'off' | 'normal', now: number) {
  return dayStateSchema.parse({ id: date, updated_at: now, date, status, note: 'z rozmowy z Towarzyszem' });
}
