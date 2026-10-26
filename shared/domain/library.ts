import { BOOKS, BOOK_BY_KEY, CATEGORY_LABEL, SKILL_LABEL, type CatalogBook, type Difficulty, type LibraryCategory, type Skill } from '../catalog/books';
import { PATH_BY_KEY } from '../catalog/academy';
import { bookSchema, eventSchema, type Book, type BookStatus, type Proposal } from '../schema';
import { addDays, daysBetween, hhmm, plDate } from '../time';
import { allProgress } from './academy';
import { dayContext } from './day';
import { alive, newId, type Clock, type Snapshot } from './snapshot';

/* ---------- statuses ---------- */

/** `planned` is stored as before; only its label changed ("Polecona" → "Chcę przeczytać"). */
export const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  suggested: 'Zaproponowana',
  planned: 'Chcę przeczytać',
  bought: 'Kupiona',
  reading: 'Czytam',
  read: 'Ukończona',
  paused: 'Odłożona',
  dropped: 'Odrzucona',
};

/** Forward path of a book. "Kupiona" may be skipped (library copy, e-book). */
export const BOOK_FLOW: BookStatus[] = ['suggested', 'planned', 'bought', 'reading', 'read'];
export const BOOK_SIDE_STATUSES: BookStatus[] = ['paused', 'dropped'];

/* ---------- identity: no duplicates ---------- */

/** Folds case, diacritics (including ł) and punctuation, so "Pani Dalloway" and "pani  dalloway!" are the same. */
export function fold(s: string): string {
  return s.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const surname = (author: string) => fold(author.split(',')[0]).split(' ').filter(Boolean).pop() ?? '';

/** Folded titles and authors of the catalog, computed once — matching runs for every shelf row on every render. */
const INDEX = BOOKS.map((b) => ({ b, t: fold(b.title), o: b.original ? fold(b.original) : '', a: fold(b.author) }));

/** The catalog entry a title/author pair denotes, if any (matches the Polish or the original title). */
export function matchCatalog(title: string, author: string): CatalogBook | undefined {
  const t = fold(title);
  if (!t) return undefined;
  const s = surname(author);
  return INDEX.find((x) => (x.t === t || x.o === t) && (!s || x.a.includes(s)))?.b;
}

/** The library row that already represents this catalog book (by key, or by the same title and author). */
export function ownedRow(snap: Snapshot, cat: CatalogBook): Book | undefined {
  return alive(snap.books).find((b) => b.catalog_key === cat.key || matchCatalog(b.title, b.author)?.key === cat.key);
}

/** A custom entry that duplicates something already on the shelf (catalog or custom). */
export function duplicateOf(snap: Snapshot, title: string, author: string): Book | undefined {
  const t = fold(title);
  const cat = matchCatalog(title, author);
  const s = surname(author);
  return alive(snap.books).find((b) => (cat && (b.catalog_key === cat.key || matchCatalog(b.title, b.author)?.key === cat.key))
    || (fold(b.title) === t && (!s || !b.author || fold(b.author).includes(s))));
}

/* ---------- reading time and deadlines ---------- */

/** Pages per hour: poetry is read slowly, dense texts slower than easy ones. */
function pace(cat: CatalogBook | undefined): number {
  if (!cat) return 25;
  if (cat.category === 'poetry_pl' || cat.category === 'poetry_world') return 22;
  return cat.difficulty === 3 ? 20 : cat.difficulty === 2 ? 28 : 36;
}

/** Estimated reading hours. Reference books and essays are read by dipping in, so they take a fraction of cover-to-cover time. */
export function readingHours(book: Pick<Book, 'pages'> & { catalog_key?: string | null }): number {
  const cat = book.catalog_key ? BOOK_BY_KEY[book.catalog_key] : undefined;
  const pages = book.pages ?? cat?.pages ?? 250;
  const h = pages / pace(cat);
  return Math.max(1, Math.round(cat?.dip ? h * 0.4 : h));
}

/** Non-breaking spaces keep "ok. 10 h" on one line. */
export const hoursLabel = (h: number) => (h < 2 ? 'ok.\u00a01–2\u00a0h' : `ok.\u00a0${h}\u00a0h`);

export interface DeadlineSuggestion { due: string; weeks: number; explanation: string }

/**
 * Flexible deadline. Reading time is spread over what the next four weeks realistically allow
 * (≈25 min on days with free time, none on sick/off days), halved per book already in progress,
 * plus a week of slack. A guide, never a promise — nothing is tracked daily.
 */
export function suggestDeadline(snap: Snapshot, book: Pick<Book, 'pages'> & { catalog_key?: string | null; id?: string }, today: string): DeadlineSuggestion {
  const hours = readingHours(book);
  let readingDays = 0;
  for (let i = 0; i < 28; i++) {
    const ctx = dayContext(snap, addDays(today, i));
    if (ctx.status === 'sick' || ctx.status === 'off' || ctx.status === 'vacation') continue;
    if (ctx.windows.length) readingDays++;
  }
  const parallel = alive(snap.books).filter((b) => b.status === 'reading' && b.id !== book.id).length;
  const minutesPerWeek = Math.max(45, (readingDays / 4) * 25) / (1 + parallel);
  const weeks = Math.min(40, Math.ceil((hours * 60) / minutesPerWeek) + 1);
  return {
    due: addDays(today, weeks * 7),
    weeks,
    explanation: `Szacunek: ${hoursLabel(hours)} czytania; przy ~${Math.round(minutesPerWeek)} min tygodniowo${parallel ? ' (czytasz też inne książki)' : ''} to ${weeks - 1} tyg. plus tydzień zapasu. To orientacja — nie ma kar za przekroczenie.`,
  };
}

/* ---------- taste: what the person's own reading says ---------- */

const BASE_FOCUS: Record<Skill, number> = {
  imagery: 3, metaphor: 3, implicit_emotion: 3, ambiguity: 2.5, language: 2.5, storytelling: 2, character: 2, symbolism: 2,
  poetry: 2, existential: 2, style: 1.5, songwriting: 1.5, rhythm: 1.5, creative_process: 1, mind: 1, voice: 0.5, production: 0.3,
};

/** Words in the profile that raise a skill. Light touch: the profile nudges, the reading history decides. */
const PROFILE_HINTS: [RegExp, Skill][] = [
  [/metafor/, 'metaphor'], [/obraz|wizual/, 'imagery'], [/emocj|uczuc|melanchol/, 'implicit_emotion'], [/wielowarstw|niejednoznacz|niedopowiedz/, 'ambiguity'],
  [/opowie|storytell|histori/, 'storytelling'], [/filozof|egzystenc|sens/, 'existential'], [/poezj|wiersz/, 'poetry'], [/symbol/, 'symbolism'],
  [/j[eę]zyk|s[lł]own|s[lł]ow/, 'language'], [/rytm|flow|rap/, 'rhythm'], [/psycholog|postac|postaci/, 'character'],
];

export interface Taste {
  skills: Record<Skill, number>;
  finished: { book: Book; cat?: CatalogBook }[];
  /** Categories already on the shelf in any live status. */
  shelfCategories: Set<LibraryCategory>;
  /** Categories of the last finished or in-progress books, newest first. */
  recent: LibraryCategory[];
  /** Highest difficulty the person has handled and found understandable. */
  comfort: Difficulty;
  hasFeedback: boolean;
}

export function tasteOf(snap: Snapshot): Taste {
  const skills = { ...BASE_FOCUS };
  const p = snap.profile;
  const text = fold([p?.music_style, p?.style_text, p?.goals_text, p?.vision, ...(p?.inspirations ?? []), ...(p?.techniques ?? [])].filter(Boolean).join(' '));
  if (text) for (const [re, s] of PROFILE_HINTS) if (re.test(text)) skills[s] += 0.7;

  const rows = alive(snap.books);
  const finished = rows.filter((b) => b.status === 'read').map((b) => ({ book: b, cat: b.catalog_key ? BOOK_BY_KEY[b.catalog_key] : matchCatalog(b.title, b.author) }))
    .sort((a, b) => (b.book.finished_at ?? b.book.status_changed_at ?? 0) - (a.book.finished_at ?? a.book.status_changed_at ?? 0));
  let comfort: Difficulty = 2;
  for (const { book, cat } of finished) {
    if (!cat) continue;
    const delta = book.rating == null ? 0 : (book.rating - 3) / 2; // 1..5 → −1..+1
    for (const s of cat.skills) skills[s] += delta * 1.4 + (book.direction === 'more' ? 0.6 : 0);
    if (book.clarity !== 'hard' && cat.difficulty === 3) comfort = 3;
    if (book.clarity === 'hard' && cat.difficulty <= comfort) comfort = Math.max(1, cat.difficulty - 1) as Difficulty;
  }
  for (const b of rows.filter((x) => x.status === 'dropped')) {
    const cat = b.catalog_key ? BOOK_BY_KEY[b.catalog_key] : undefined;
    if (cat) for (const s of cat.skills) skills[s] -= 0.6;
  }
  const catOf = (b: Book) => (b.catalog_key ? BOOK_BY_KEY[b.catalog_key] : matchCatalog(b.title, b.author));
  const shelf = new Set<LibraryCategory>();
  for (const b of rows) if (b.status !== 'dropped') { const c = catOf(b); if (c) shelf.add(c.category); }
  const recent = rows.filter((b) => b.status === 'read' || b.status === 'reading')
    .sort((a, b) => (b.finished_at ?? b.started_at ?? b.status_changed_at ?? 0) - (a.finished_at ?? a.started_at ?? a.status_changed_at ?? 0))
    .slice(0, 3).map((b) => catOf(b)?.category).filter((c): c is LibraryCategory => !!c);
  return { skills, finished, shelfCategories: shelf, recent, comfort, hasFeedback: finished.some((f) => f.book.rating != null) };
}

/* ---------- recommendations ---------- */

export interface BookRecommendation {
  book: CatalogBook;
  /** Why this one, for this person, now. Built only from catalog facts and the person's own library. */
  why: string;
  /** Opens a category that is not on the shelf yet — a conscious widening of horizons. */
  horizon: boolean;
  score: number;
}

export interface RecommendOptions { limit?: number; light?: boolean; /** Keep the picks varied (default). */ diverse?: boolean; after?: Book }

function scoreOf(taste: Taste, b: CatalogBook, active: Set<string>, done: Set<string>, opts: RecommendOptions): { score: number; hit?: string } {
  let score = 0;
  const w = b.skills.map((s) => taste.skills[s]);
  score += w.reduce((a, x) => a + x, 0) / Math.max(1, w.length);
  const hit = b.paths.find((p) => active.has(p));
  if (hit) score += 1.5; else if (b.paths.some((p) => done.has(p))) score += 0.6;
  if (!b.verified) score -= 1;
  score += b.pl === 'orig' ? 0.4 : b.pl === 'verified' ? 0.3 : b.pl === 'unchecked' || b.pl === 'none' ? -0.2 : 0;
  if (b.difficulty > taste.comfort) score -= 1.5 * (b.difficulty - taste.comfort);
  if (opts.light) score += b.difficulty === 1 ? 1 : b.difficulty === 3 ? -2 : 0;
  // "New area" only means something once there is a shelf to compare with.
  const horizon = taste.shelfCategories.size > 0 && !taste.shelfCategories.has(b.category);
  if (horizon) score += 0.8;
  // Varied reading: do not repeat what was just read, unless the person asked for more of it.
  const wantsMore = opts.after?.direction === 'more';
  const repeats = taste.recent.filter((c) => c === b.category).length;
  if (repeats) score -= wantsMore ? 0 : 1.2 * repeats;
  if (opts.after) {
    const prev = opts.after.catalog_key ? BOOK_BY_KEY[opts.after.catalog_key] : undefined;
    if (prev && opts.after.direction === 'more') {
      if (prev.category === b.category) score += 1.6;
      score += 0.5 * b.skills.filter((s) => prev.skills.includes(s)).length;
    } else if (prev && opts.after.direction === 'different') {
      if (prev.category === b.category) score -= 2;
      if (horizon) score += 1.2;
      score -= 0.5 * b.skills.filter((s) => prev.skills.includes(s)).length;
    }
  }
  return { score, hit };
}

function reasonOf(b: CatalogBook, horizon: boolean, hit: string | undefined, after?: Book): string {
  const lead: string[] = [];
  if (after) {
    const title = `„${after.title}”`;
    if (after.direction === 'more') lead.push(`Po ${title}, bo chcesz iść dalej w tym kierunku.`);
    else if (after.direction === 'different') lead.push(`Po ${title} — celowo coś innego.`);
    else lead.push(`Po ${title}.`);
  }
  if (hit) lead.push(`Pogłębia ścieżkę „${PATH_BY_KEY[hit as keyof typeof PATH_BY_KEY].title}”, którą masz w toku.`);
  if (horizon) lead.push(`Nowy obszar na Twojej półce: ${CATEGORY_LABEL[b.category].toLowerCase()}.`);
  lead.push(`Rozwija: ${b.skills.slice(0, 3).map((s) => SKILL_LABEL[s]).join(', ')}.`);
  return `${lead.join(' ')} ${b.why}`;
}

/**
 * Real titles from the catalog, ranked by the person's focus (imagery, metaphor, implicit emotion, language,
 * storytelling, character, philosophy, poetry), their profile, their ratings and what they just read. Books already
 * on the shelf in any status — including "Odrzucona" — are never offered again. The list is deliberately varied:
 * no two picks from the same category, and a new area is favoured over the one just read.
 */
export function recommendBooks(snap: Snapshot, opts: RecommendOptions | number = {}): BookRecommendation[] {
  const o: RecommendOptions = typeof opts === 'number' ? { limit: opts } : opts;
  const limit = o.limit ?? 4;
  const taste = tasteOf(snap);
  const progress = allProgress(snap);
  const active = new Set<string>(progress.filter((p) => p.state === 'active').map((p) => p.path.key));
  const done = new Set<string>(progress.filter((p) => p.state === 'done').map((p) => p.path.key));
  const pool: BookRecommendation[] = [];
  for (const b of BOOKS) {
    if (b.retired || ownedRow(snap, b)) continue;
    const { score, hit } = scoreOf(taste, b, active, done, o);
    const horizon = taste.shelfCategories.size > 0 && !taste.shelfCategories.has(b.category);
    pool.push({ book: b, why: reasonOf(b, horizon, hit, o.after), horizon, score });
  }
  pool.sort((a, b) => b.score - a.score || a.book.key.localeCompare(b.book.key));
  if (o.diverse === false) return pool.slice(0, limit);

  // Greedy pick with a penalty for repeating a category or the leading skill of what is already chosen.
  const picked: BookRecommendation[] = [];
  const rest = [...pool];
  while (picked.length < limit && rest.length) {
    let bestI = 0;
    let best = -Infinity;
    rest.forEach((r, i) => {
      const sameCat = picked.filter((p) => p.book.category === r.book.category).length;
      const sameLead = picked.filter((p) => p.book.skills[0] === r.book.skills[0]).length;
      const adj = r.score - 2.5 * sameCat - 0.6 * sameLead;
      if (adj > best) { best = adj; bestI = i; }
    });
    picked.push(rest.splice(bestI, 1)[0]);
  }
  // At least one pick widens the horizon when a candidate of similar standing exists.
  if (limit >= 3 && picked.length === limit && !picked.some((p) => p.horizon)) {
    const alt = rest.find((r) => r.horizon && r.score >= picked[picked.length - 1].score - 1.5);
    if (alt) picked[picked.length - 1] = alt;
  }
  return picked;
}

/** The next book after finishing one: shaped by the answers given (liked, understood, same direction or not). */
export function nextBookAfter(snap: Snapshot, finished: Book): BookRecommendation | null {
  return recommendBooks(snap, { limit: 1, after: finished, light: finished.clarity === 'hard' })[0] ?? null;
}

/* ---------- finishing a book ---------- */

export interface BookFeedback { rating: number | null; clarity: Book['clarity']; direction: Book['direction'] }

/** Every answer is optional; skipping the questions still finishes the book. */
export function finishedRow(b: Book, fb: Partial<BookFeedback>, now: number): Book {
  return bookSchema.parse({
    ...b, status: 'read', progress: 100, status_changed_at: now, finished_at: b.finished_at ?? now, started_at: b.started_at ?? b.status_changed_at ?? now,
    rating: fb.rating ?? b.rating, clarity: fb.clarity ?? b.clarity, direction: fb.direction ?? b.direction, updated_at: now,
  });
}

/** Row for a status change, keeping the reading timeline and an orientation deadline. */
export function statusRow(snap: Snapshot, b: Book, status: BookStatus, today: string, now: number): Book {
  const patch: Partial<Book> = { status, status_changed_at: now, updated_at: now };
  if (status === 'reading') {
    patch.started_at = b.started_at ?? now;
    if (!b.due_date) patch.due_date = suggestDeadline(snap, b, today).due;
  }
  if (status === 'read') { patch.finished_at = b.finished_at ?? now; patch.progress = 100; }
  return bookSchema.parse({ ...b, ...patch });
}

export function newBookRow(cat: CatalogBook, status: BookStatus, why: string, snap: Snapshot, today: string, now: number): Book {
  const base = bookSchema.parse({
    id: newId('bk'), updated_at: now, title: cat.title, author: cat.author, topic: cat.topic, learning_goal: cat.learning_goal,
    status: 'planned', pages: cat.pages, catalog_key: cat.key, reason: why.slice(0, 1000), status_changed_at: now,
  });
  return statusRow(snap, base, status, today, now);
}

/* ---------- optional reflection: never a writing task ---------- */

const REFLECT: Partial<Record<Skill, string>> = {
  imagery: 'Który obraz z dzisiejszego czytania zostaje w głowie? Co sprawia, że jest konkretny?',
  metaphor: 'Wybierz jedną metaforę. Co łączy dwie rzeczy, które zwykle się nie spotykają?',
  ambiguity: 'Gdzie tekst zostawia niedopowiedzenie? Co by się zmieniło, gdyby zostało wyjaśnione?',
  language: 'Znajdź jedno słowo lub zwrot, który brzmi inaczej niż język codzienny. Co daje?',
  storytelling: 'Jak autor prowadzi uwagę — co ujawnia od razu, a co zatrzymuje na później?',
  implicit_emotion: 'Jak emocja jest tu zbudowana bez nazwania — przez rzecz, gest, rytm, pominięcie?',
  character: 'Co ta postać mówi, a co robi? Gdzie te dwie rzeczy się rozjeżdżają?',
  existential: 'Jakie pytanie stawia ten fragment — i czy na nie odpowiada, czy je zostawia?',
  poetry: 'Przeczytaj jeden wiersz na głos. Gdzie oddech zatrzymuje się naturalnie?',
  style: 'Co sprawia, że ten głos jest rozpoznawalny po jednym zdaniu?',
  symbolism: 'Który symbol wraca? Co się zmienia, kiedy pojawia się po raz drugi?',
  rhythm: 'Wystukaj rytm jednego zdania. Czy zgadza się z jego znaczeniem?',
  songwriting: 'Porównaj z jedną piosenką, którą dobrze znasz — czy to samo działa tam?',
  creative_process: 'Co z tego sposobu pracy pasuje do Twojego rytmu, a co wyraźnie nie?',
  mind: 'Jaki mechanizm myślenia lub czucia tu opisano? Gdzie go rozpoznajesz?',
  voice: 'Co w tym opisie zmienia się, kiedy posłuchać własnego głosu?',
  production: 'Czy ta idea przydałaby się przy jednym z Twoich nagrań?',
};

export interface Reflection { prompt: string; carry: string }

/**
 * An optional thought to carry while reading. It asks for noticing, not for producing — there is no word count,
 * no number of lines and nothing to submit. The second line is only an offer for a session that happens anyway.
 */
export function reflectionFor(cat: CatalogBook | undefined, seed = 0): Reflection | null {
  if (!cat) return null;
  const options = cat.skills.map((s) => REFLECT[s]).filter((x): x is string => !!x);
  if (!options.length) return null;
  return {
    prompt: cat.reflect ?? options[seed % options.length],
    carry: 'Jeśli najbliższa sesja w Creative Workflow wyjdzie naturalnie, możesz posłuchać swojego szkicu pod kątem tej techniki. Nie trzeba niczego pisać ani zapisywać.',
  };
}

/* ---------- catalog search and filters ---------- */

export interface CatalogFilter { query?: string; category?: LibraryCategory | null; skill?: Skill | null; polishOnly?: boolean; maxDifficulty?: Difficulty | null; hideShelf?: boolean }

export function searchCatalog(snap: Snapshot, f: CatalogFilter): CatalogBook[] {
  const q = fold(f.query ?? '');
  const words = q.split(' ').filter(Boolean);
  const out = BOOKS.filter((b) => {
    if (b.retired) return false;
    if (f.category && b.category !== f.category) return false;
    if (f.skill && !b.skills.includes(f.skill)) return false;
    if (f.polishOnly && b.pl !== 'orig' && b.pl !== 'verified') return false;
    if (f.maxDifficulty && b.difficulty > f.maxDifficulty) return false;
    if (f.hideShelf && ownedRow(snap, b)) return false;
    if (!words.length) return true;
    const hay = fold([b.title, b.original, b.author, CATEGORY_LABEL[b.category], ...b.skills.map((s) => SKILL_LABEL[s]), b.summary].filter(Boolean).join(' '));
    return words.every((w) => hay.includes(w));
  });
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.author.localeCompare(b.author, 'pl') || a.title.localeCompare(b.title, 'pl'));
}

/* ---------- deadlines that give way ---------- */

export interface BookNudge { book: Book; kind: 'overdue' | 'idle'; text: string }

/** Gentle prompts: a passed orientation date, or a book untouched for three weeks. Never an accusation. */
export function bookNudges(snap: Snapshot, today: string, nowMs: number): BookNudge[] {
  const out: BookNudge[] = [];
  for (const b of alive(snap.books).filter((x) => x.status === 'reading')) {
    if (b.due_date && b.due_date < today) out.push({ book: b, kind: 'overdue', text: `Orientacyjny termin przy „${b.title}” minął ${daysBetween(b.due_date, today)} dni temu. To tylko wskazówka — przesunąć?` });
    else if (nowMs - (b.updated_at ?? 0) > 21 * 86400000) out.push({ book: b, kind: 'idle', text: `„${b.title}” leży od trzech tygodni. Kontynuować, przesunąć termin czy odłożyć?` });
  }
  return out;
}

export type ShiftReason = 'sick' | 'busy' | 'tired' | 'manual';

const SHIFT_NOTE: Record<ShiftReason, string> = {
  sick: 'Choroba nie przesuwa terminów czytania na gorsze — odsuwamy je razem z nią.',
  busy: 'Gdy brakuje czasu, termin ustępuje. Czytanie ma być przyjemnością, nie obowiązkiem.',
  tired: 'Przy braku energii czytanie może poczekać.',
  manual: 'Termin jest tylko orientacją — przesunięcie nic nie kosztuje.',
};

/**
 * Proposal to move the orientation deadlines of books in progress (those due within four weeks, or already past).
 * `days` is how far to move them; overdue ones restart from today. Only a proposal: nothing changes until it is applied.
 */
export function deadlineShiftProposal(snap: Snapshot, clock: Clock, opts: { days?: number; reason?: ShiftReason; bookId?: string } = {}): Proposal | null {
  const reason = opts.reason ?? 'manual';
  const days = opts.days ?? (reason === 'sick' ? 10 : 14);
  const horizon = addDays(clock.today, 28);
  const targets = alive(snap.books).filter((b) => (opts.bookId ? b.id === opts.bookId : b.status === 'reading' && !!b.due_date && b.due_date <= horizon));
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  for (const b of targets) {
    if (b.status === 'read' || b.status === 'dropped') continue;
    const from = b.due_date && b.due_date >= clock.today ? b.due_date : clock.today;
    const to = addDays(from, days);
    const after = bookSchema.parse({ ...b, due_date: to, updated_at: clock.nowMs });
    changes.push({ entity: 'books', before: b as unknown as Record<string, unknown>, after: after as unknown as Record<string, unknown>, label: `„${b.title}”: ${b.due_date ? `do ${plDate(b.due_date)}` : 'bez terminu'} → do ${plDate(to)}` });
  }
  if (!changes.length) return null;
  return { id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'mentor', status: 'pending', decided_at: null, title: 'Przesunąć terminy czytania?', rationale: SHIFT_NOTE[reason], changes };
}

/**
 * Optional reading blocks, at most three in the next ten days, short and never on a day without room.
 * Blocks have priority 3 ("opcjonalne"); skipping them costs nothing and never touches the music rhythm.
 */
export function planReading(snap: Snapshot, clock: Clock, book: Pick<Book, 'title'>, count = 3): Proposal | null {
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  let last: string | null = null;
  for (let i = 0; i < 10 && changes.length < count; i++) {
    const d = addDays(clock.today, i);
    if (last && addDays(last, 1) === d) continue;
    const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
    if (ctx.mode === 'none' || ctx.status === 'sick' || ctx.status === 'off' || ctx.status === 'vacation') continue;
    if (ctx.commitments.some((e) => e.kind === 'reading')) continue;
    const len = 25;
    const w = ctx.windows.find((x) => x.end - x.start >= len + 20);
    if (!w || ctx.remainingMinutes < len + 20) continue;
    const start = Math.ceil(Math.max(w.start, Math.min(w.end - len, 20 * 60)) / 15) * 15;
    if (start + len > w.end) continue;
    const ev = eventSchema.parse({ id: newId('ev'), updated_at: clock.nowMs, kind: 'reading', title: `Czytanie: ${book.title}`, date: d, start_min: start, end_min: start + len, priority: 3, source: 'mentor', proposal_id: pid, notes: 'Opcjonalne. Bez raportowania stron.' });
    changes.push({ entity: 'events', before: null, after: ev as unknown as Record<string, unknown>, label: `${plDate(d)} ${hhmm(start)}–${hhmm(start + len)} · ${ev.title}` });
    last = d;
  }
  if (!changes.length) return null;
  return { id: pid, updated_at: clock.nowMs, deleted_at: null, source: 'mentor', status: 'pending', decided_at: null, title: `Czytanie: ${book.title}`, rationale: 'Krótkie, opcjonalne bloki w dniach, w których jest miejsce. Pominięcie ich nie wpływa na rytm.', changes };
}

/* ---------- summary for screens and the AI context ---------- */

export function libraryCounts(snap: Snapshot): Record<BookStatus, number> {
  const c = Object.fromEntries(Object.keys(BOOK_STATUS_LABEL).map((k) => [k, 0])) as Record<BookStatus, number>;
  for (const b of alive(snap.books)) c[b.status]++;
  return c;
}
