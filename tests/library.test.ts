import { describe, expect, it } from 'vitest';
import { BOOKS, BOOK_BY_KEY, CATEGORY_LABEL, PL_LABEL } from '../shared/catalog/books';
import { PATH_BY_KEY } from '../shared/catalog/academy';
import { bookSchema, BOOK_STATUSES, type Book } from '../shared/schema';
import { openLessonRows } from '../shared/domain/academy';
import {
  BOOK_STATUS_LABEL, bookNudges, deadlineShiftProposal, duplicateOf, finishedRow, fold, matchCatalog, newBookRow, nextBookAfter, ownedRow,
  planReading, readingHours, recommendBooks, reflectionFor, searchCatalog, statusRow, suggestDeadline,
} from '../shared/domain/library';
import { applyWrites } from '../shared/domain/proposals';
import { catalogText } from '../shared/domain/mentorContext';
import { addDays } from '../shared/time';
import { detectIntent, understand } from '../shared/domain/companion';
import { clock, dayState, MONDAY, routine, snap } from './fixtures';

const live = BOOKS.filter((b) => !b.retired);
let n = 0;
const row = (over: Partial<Book> & Pick<Book, 'title'>): Book => bookSchema.parse({ id: `bk_${++n}`, updated_at: 1, ...over });
const fromCat = (key: string, over: Partial<Book> = {}): Book => row({ title: BOOK_BY_KEY[key].title, author: BOOK_BY_KEY[key].author, catalog_key: key, ...over });

/** Anything that reads as an assignment to write — the library must never contain one. */
const WRITING_TASK = /\b(napisz|stwórz|ułóż|skomponuj)\b|\b\d+\s*(wers|wersy|wersów|zwrotek|linijek)\b/i;

describe('catalog integrity', () => {
  it('has at least 100 live, distinct books', () => {
    expect(live.length).toBeGreaterThanOrEqual(100);
    expect(new Set(BOOKS.map((b) => b.key)).size).toBe(BOOKS.length);
    const ids = live.map((b) => `${fold(b.title)}|${fold(b.author).split(' ').pop()}`);
    expect(new Set(ids).size).toBe(ids.length);
    const originals = live.filter((b) => b.original).map((b) => fold(b.original!));
    expect(new Set(originals).size).toBe(originals.length);
  });

  it('every entry carries the fields a recommendation needs', () => {
    for (const b of BOOKS) {
      expect(b.title.length, b.key).toBeGreaterThan(1);
      expect(b.author.length, b.key).toBeGreaterThan(2);
      expect(b.summary.length, b.key).toBeGreaterThan(40);
      expect(b.why.length, b.key).toBeGreaterThan(20);
      expect(b.learning_goal.length, b.key).toBeGreaterThan(15);
      expect(b.skills.length, b.key).toBeGreaterThan(0);
      expect([1, 2, 3], b.key).toContain(b.difficulty);
      expect(b.pages, b.key).toBeGreaterThan(30);
      expect(CATEGORY_LABEL[b.category], b.key).toBeTruthy();
      expect(PL_LABEL[b.pl], b.key).toBeTruthy();
      for (const p of b.paths) expect(PATH_BY_KEY[p], `${b.key} path ${p}`).toBeTruthy();
    }
  });

  it('never marks unconfirmed data as certain', () => {
    for (const b of BOOKS) {
      if (!b.verified) expect(b.unverified_note, b.key).toBeTruthy();
      // A Polish edition is only claimed for entries whose existence was confirmed.
      if (b.pl === 'unconfirmed' || b.pl === 'none' || b.pl === 'unchecked') expect(b.pl_note, b.key).toBeUndefined();
    }
    // The old catalog claimed Polish editions for these; sources did not confirm them.
    expect(BOOK_BY_KEY['rubin-creative-act'].pl).toBe('none');
    expect(BOOK_BY_KEY['mckee-story'].pl).toBe('unconfirmed');
    expect(BOOK_BY_KEY['kleon-steal'].pl).toBe('unconfirmed');
  });

  it('covers the areas the library exists for', () => {
    const cats = new Set(live.map((b) => b.category));
    for (const c of ['poetry_pl', 'poetry_world', 'novel', 'existential', 'contemporary', 'language', 'philosophy', 'psychology', 'creativity', 'songwriting', 'biography'] as const) expect(cats.has(c), c).toBe(true);
    const skills = new Set(live.flatMap((b) => b.skills));
    for (const s of ['imagery', 'metaphor', 'ambiguity', 'language', 'storytelling', 'implicit_emotion', 'character', 'existential', 'poetry', 'style', 'songwriting'] as const) expect(skills.has(s), s).toBe(true);
    expect(live.filter((b) => b.pl === 'orig').length).toBeGreaterThanOrEqual(15);
  });

  it('keeps every key the old catalog had, so saved books still resolve', () => {
    const legacy = ['pattison-wbl', 'bradley-rhymes', 'edwards-howtorap', 'tweedy-onesong', 'rubin-creative-act', 'kleon-steal', 'king-onwriting', 'rilke-letters', 'szymborska-wybor', 'poswiatowska-wybor', 'herbert-cogito', 'mckee-story', 'senior-mixing', 'desantis-making', 'herstand-newbiz', 'passman-allyouneed', 'miller-structure', 'perricone-melody', 'pattison-form', 'ohriner-flow', 'connor-artistry', 'moore-songmeans'];
    for (const k of legacy) expect(BOOK_BY_KEY[k], k).toBeTruthy();
    expect(BOOK_BY_KEY['herstand-newbiz'].retired).toBe(true);
  });

  it('contains no writing assignments — in the catalog or in the reflection prompts', () => {
    for (const b of BOOKS) for (const t of [b.summary, b.why, b.learning_goal, b.reflect ?? '']) expect(t, b.key).not.toMatch(WRITING_TASK);
    for (const b of live) {
      const r = reflectionFor(b, 0);
      expect(r, b.key).toBeTruthy();
      expect(`${r!.prompt} ${r!.carry}`).not.toMatch(WRITING_TASK);
      expect(r!.carry).toMatch(/Nie trzeba/);
    }
  });

  it('copy is gender-neutral', () => {
    const text = BOOKS.map((b) => `${b.summary} ${b.why} ${b.learning_goal}`).join(' ');
    expect(text).not.toMatch(/\b(zrobiłeś|zrobiłaś|przeczytałeś|przeczytałaś|sam\(a\)|zaczął\(a\))/i);
  });
});

describe('statuses and saved data', () => {
  it('offers the six requested statuses; "planned" is now "Chcę przeczytać"', () => {
    expect(BOOK_STATUS_LABEL).toMatchObject({ suggested: 'Zaproponowana', planned: 'Chcę przeczytać', bought: 'Kupiona', reading: 'Czytam', read: 'Ukończona', dropped: 'Odrzucona' });
    for (const s of BOOK_STATUSES) expect(BOOK_STATUS_LABEL[s]).toBeTruthy();
  });

  it('a row saved before the library existed still parses, unchanged', () => {
    const old = { id: 'bk_old', updated_at: 5, title: 'Pan Cogito', author: 'Zbigniew Herbert', status: 'reading', due_date: '2026-12-01', notes: 'moje', catalog_key: 'herbert-cogito', pages: 120 };
    const b = bookSchema.parse(old);
    expect(b).toMatchObject({ status: 'reading', due_date: '2026-12-01', notes: 'moje', rating: null, clarity: null, direction: null, started_at: null, finished_at: null });
  });

  it('status changes keep the reading timeline', () => {
    const s = snap();
    const b = fromCat('woolf-dalloway', { status: 'planned' });
    const reading = statusRow(s, b, 'reading', MONDAY, 1000);
    expect(reading.started_at).toBe(1000);
    expect(reading.due_date).toBeTruthy();
    const done = statusRow(s, reading, 'read', MONDAY, 2000);
    expect(done).toMatchObject({ status: 'read', started_at: 1000, finished_at: 2000, progress: 100 });
  });

  it('finishing without answering the questions still finishes the book', () => {
    const b = finishedRow(fromCat('camus-obcy', { status: 'reading' }), {}, 3000);
    expect(b).toMatchObject({ status: 'read', rating: null, clarity: null, direction: null });
  });
});

describe('no duplicates', () => {
  it('recognises a catalog book by Polish or original title, ignoring case, diacritics and punctuation', () => {
    expect(matchCatalog('  pani   DALLOWAY!', 'Virginia Woolf')?.key).toBe('woolf-dalloway');
    expect(matchCatalog('Just Kids', 'Patti Smith')?.key).toBe('smith-dzieciaki');
    expect(matchCatalog('Poniedziałkowe dzieci', 'Patti Smith')?.key).toBe('smith-dzieciaki');
    expect(matchCatalog('Napoj cienisty', 'Boleslaw Lesmian')?.key).toBe('lesmian-napoj');
    expect(matchCatalog('Pan Cogito', 'Jan Kowalski')).toBeUndefined();
  });

  it('a hand-typed copy of a catalog book counts as owned', () => {
    const s = snap({ books: [row({ title: 'pan cogito', author: 'Herbert' })] });
    expect(ownedRow(s, BOOK_BY_KEY['herbert-cogito'])).toBeTruthy();
    expect(duplicateOf(s, 'Pan Cogito', 'Zbigniew Herbert')).toBeTruthy();
    expect(duplicateOf(s, 'Inna książka', 'Ktoś')).toBeUndefined();
    expect(recommendBooks(s, { limit: 200, diverse: false }).some((r) => r.book.key === 'herbert-cogito')).toBe(false);
  });

  it('a removed (deleted) row does not block the book', () => {
    const s = snap({ books: [{ ...fromCat('camus-obcy'), deleted_at: 9 }] });
    expect(ownedRow(s, BOOK_BY_KEY['camus-obcy'])).toBeUndefined();
  });
});

describe('recommendations', () => {
  it('are real catalog entries, never owned, retired or rejected', () => {
    const s = snap({ books: [fromCat('ishiguro-okruchy', { status: 'read' }), fromCat('kafka-proces', { status: 'dropped' }), fromCat('calvino-miasta', { status: 'suggested' })] });
    const r = recommendBooks(s, { limit: 200, diverse: false });
    const keys = r.map((x) => x.book.key);
    expect(keys).not.toContain('ishiguro-okruchy');
    expect(keys).not.toContain('kafka-proces');
    expect(keys).not.toContain('calvino-miasta');
    expect(r.some((x) => x.book.retired)).toBe(false);
    expect(new Set(keys).size).toBe(keys.length);
    expect(r.every((x) => BOOK_BY_KEY[x.book.key])).toBe(true);
  });

  it('every recommendation says why, from facts rather than invention', () => {
    for (const r of recommendBooks(snap(), 5)) {
      expect(r.why).toMatch(/Rozwija:/);
      expect(r.why).toContain(r.book.why);
    }
  });

  it('are varied: no two of the top picks share a category, and one opens a new area', () => {
    const s = snap({ books: [fromCat('szymborska-wybor', { status: 'read', rating: 5 }), fromCat('rozewicz-niepokoj', { status: 'read', rating: 5 })] });
    const r = recommendBooks(s, 4);
    expect(new Set(r.map((x) => x.book.category)).size).toBe(r.length);
    expect(r.some((x) => x.horizon)).toBe(true);
    // Two poetry books just read: the list does not simply serve more of the same.
    expect(r.filter((x) => x.book.category === 'poetry_pl').length).toBeLessThanOrEqual(1);
  });

  it('"new area" is only claimed when there is a shelf to compare with', () => {
    expect(recommendBooks(snap(), 5).some((r) => r.horizon)).toBe(false);
    expect(recommendBooks(snap(), 5).some((r) => /Nowy obszar/.test(r.why))).toBe(false);
  });

  it('lean on what the person is developing: imagery and implicit emotion lead for a new reader', () => {
    const top = recommendBooks(snap(), 4).flatMap((r) => r.book.skills);
    expect(top.some((s) => s === 'implicit_emotion' || s === 'imagery' || s === 'metaphor')).toBe(true);
    // Production manuals are not what this library is for.
    expect(recommendBooks(snap(), 4).some((r) => r.book.category === 'production')).toBe(false);
  });

  it('an active Academy path raises its books', () => {
    const base = recommendBooks(snap(), { limit: 200, diverse: false }).findIndex((r) => r.book.key === 'miller-structure');
    const withPath = recommendBooks(snap({ learning: openLessonRows(snap(), 'vocal-breath', 1) }), { limit: 200, diverse: false }).findIndex((r) => r.book.key === 'miller-structure');
    expect(withPath).toBeLessThan(base);
  });

  it('the profile nudges the choice, the reading history decides', () => {
    const plain = recommendBooks(snap(), { limit: 200, diverse: false }).find((r) => r.book.key === 'maslowska-wojna')!;
    const s = snap();
    const rap = recommendBooks({ ...s, profile: { ...s.profile!, music_style: 'rap, flow i rytm' } }, { limit: 200, diverse: false }).find((r) => r.book.key === 'maslowska-wojna')!;
    expect(rap.score).toBeGreaterThan(plain.score);
  });

  it('"coś lżejszego" favours easy books', () => {
    const r = recommendBooks(snap(), { limit: 4, light: true });
    expect(r.filter((x) => x.book.difficulty === 3).length).toBe(0);
  });
});

describe('what happens after finishing a book', () => {
  const finish = (key: string, fb: Partial<Pick<Book, 'rating' | 'clarity' | 'direction'>>) => finishedRow(fromCat(key, { status: 'reading' }), fb, 10);

  it('"podobnie" continues in the same direction', () => {
    const done = finish('ishiguro-okruchy', { rating: 5, clarity: 'clear', direction: 'more' });
    const next = nextBookAfter(snap({ books: [done] }), done)!;
    const prev = BOOK_BY_KEY['ishiguro-okruchy'];
    expect(next.book.key).not.toBe(prev.key);
    expect(next.book.skills.some((s) => prev.skills.includes(s))).toBe(true);
    expect(next.why).toMatch(/dalej w tym kierunku/);
  });

  it('"coś innego" leaves the category and says so', () => {
    const done = finish('ishiguro-okruchy', { rating: 4, direction: 'different' });
    const next = nextBookAfter(snap({ books: [done] }), done)!;
    expect(next.book.category).not.toBe('novel');
    expect(next.why).toMatch(/celowo coś innego/);
  });

  it('a book that was too hard is followed by a gentler one', () => {
    const done = finish('kierkegaard-choroba', { rating: 3, clarity: 'hard' });
    const next = nextBookAfter(snap({ books: [done] }), done)!;
    expect(next.book.difficulty).toBeLessThan(3);
  });

  it('a disliked book lowers its themes for later recommendations', () => {
    const before = recommendBooks(snap(), { limit: 200, diverse: false }).find((r) => r.book.key === 'baudelaire-kwiaty')!.score;
    const s = snap({ books: [fromCat('dickinson-wiersze', { status: 'read', rating: 1 })] });
    const after = recommendBooks(s, { limit: 200, diverse: false }).find((r) => r.book.key === 'baudelaire-kwiaty')!.score;
    expect(after).toBeLessThan(before);
  });

  it('is never the book just finished, nor one already on the shelf', () => {
    const done = finish('woolf-fale', { rating: 5, direction: 'more' });
    const shelf = snap({ books: [done, fromCat('woolf-dalloway', { status: 'planned' })] });
    const next = nextBookAfter(shelf, done)!;
    expect(['woolf-fale', 'woolf-dalloway']).not.toContain(next.book.key);
  });
});

describe('search and filters', () => {
  const s = snap({ books: [fromCat('camus-obcy', { status: 'planned' })] });
  it('finds by author, title or theme without caring for Polish diacritics', () => {
    expect(searchCatalog(s, { query: 'szymborska' }).map((b) => b.key)).toContain('szymborska-wybor');
    expect(searchCatalog(s, { query: 'lesmian napoj' }).map((b) => b.key)).toContain('lesmian-napoj');
    expect(searchCatalog(s, { query: 'metafora' }).length).toBeGreaterThan(5);
    expect(searchCatalog(s, { query: 'zzzzqqq' })).toEqual([]);
  });
  it('filters by category, skill, Polish edition, difficulty and shelf', () => {
    expect(searchCatalog(s, { category: 'philosophy' }).every((b) => b.category === 'philosophy')).toBe(true);
    expect(searchCatalog(s, { skill: 'rhythm' }).every((b) => b.skills.includes('rhythm'))).toBe(true);
    expect(searchCatalog(s, { polishOnly: true }).every((b) => b.pl === 'orig' || b.pl === 'verified')).toBe(true);
    expect(searchCatalog(s, { maxDifficulty: 1 }).every((b) => b.difficulty === 1)).toBe(true);
    expect(searchCatalog(s, { hideShelf: true }).map((b) => b.key)).not.toContain('camus-obcy');
    expect(searchCatalog(s, {}).map((b) => b.key)).toContain('camus-obcy');
  });
  it('never lists retired titles', () => {
    expect(searchCatalog(s, { query: 'music business' }).some((b) => b.retired)).toBe(false);
  });
});

describe('deadlines that give way', () => {
  const c = clock();
  it('suggests a later date for a longer or denser book, with a week of slack', () => {
    const s = snap({ routines: [routine({})] });
    const short = suggestDeadline(s, { pages: 90, catalog_key: 'pawlikowska-pocalunki' }, MONDAY);
    const long = suggestDeadline(s, { pages: 600, catalog_key: 'dostojewski-zbrodnia' }, MONDAY);
    expect(short.due > MONDAY).toBe(true);
    expect(long.due > short.due).toBe(true);
    expect(long.explanation).toMatch(/orientacja/);
  });
  it('reading time is an estimate that treats poetry and reference books differently', () => {
    expect(readingHours({ pages: 100, catalog_key: 'szymborska-wybor' })).toBeGreaterThan(readingHours({ pages: 100, catalog_key: 'camus-obcy' }));
    expect(readingHours({ pages: 520, catalog_key: 'kopalinski-symboli' })).toBeLessThan(readingHours({ pages: 520, catalog_key: 'dostojewski-zbrodnia' }));
  });
  it('another book in progress stretches the estimate', () => {
    const alone = suggestDeadline(snap(), { pages: 300 }, MONDAY);
    const busy = suggestDeadline(snap({ books: [fromCat('camus-obcy', { status: 'reading' })] }), { pages: 300 }, MONDAY);
    expect(busy.due >= alone.due).toBe(true);
  });
  it('sickness or a busy spell produces a proposal that moves deadlines; nothing changes before "Zastosuj"', () => {
    const b = fromCat('woolf-dalloway', { status: 'reading', due_date: addDays(MONDAY, 5) });
    const s = snap({ books: [b] });
    const p = deadlineShiftProposal(s, c, { reason: 'sick', days: 10 })!;
    expect(p.status).toBe('pending');
    expect(p.changes).toHaveLength(1);
    expect(p.changes[0].after.due_date).toBe(addDays(MONDAY, 15));
    expect(s.books[0].due_date).toBe(addDays(MONDAY, 5));
    const writes = applyWrites(p, 1000);
    expect(writes.find((w) => w.entity === 'books')).toBeTruthy();
  });
  it('an overdue deadline restarts from today; finished and distant books are left alone', () => {
    const s = snap({ books: [
      fromCat('camus-obcy', { status: 'reading', due_date: addDays(MONDAY, -9) }),
      fromCat('kafka-proces', { status: 'read', due_date: addDays(MONDAY, -30) }),
      fromCat('hamsun-glod', { status: 'reading', due_date: addDays(MONDAY, 90) }),
    ] });
    const p = deadlineShiftProposal(s, c, { days: 14 })!;
    expect(p.changes).toHaveLength(1);
    expect(p.changes[0].after.due_date).toBe(addDays(MONDAY, 14));
    expect(deadlineShiftProposal(snap(), c)).toBeNull();
  });
  it('nudges point at a passed date without blame', () => {
    const s = snap({ books: [fromCat('camus-obcy', { status: 'reading', due_date: addDays(MONDAY, -3) })] });
    const n1 = bookNudges(s, MONDAY, c.nowMs);
    expect(n1).toHaveLength(1);
    expect(n1[0].text).toMatch(/tylko wskazówka/);
    expect(bookNudges(snap({ books: [fromCat('camus-obcy', { status: 'reading', due_date: addDays(MONDAY, 3), updated_at: c.nowMs })] }), MONDAY, c.nowMs)).toEqual([]);
    const idle = bookNudges(snap({ books: [fromCat('camus-obcy', { status: 'reading', due_date: addDays(MONDAY, 3), updated_at: c.nowMs - 22 * 86400000 })] }), MONDAY, c.nowMs);
    expect(idle[0]?.kind).toBe('idle');
  });
});

describe('reading in the planner', () => {
  const c = clock(MONDAY, 480);
  it('proposes a few short, optional blocks and never touches the music rhythm', () => {
    const s = snap({ routines: [routine({})] });
    const p = planReading(s, c, { title: 'Pani Dalloway' })!;
    expect(p).toBeTruthy();
    expect(p.changes.length).toBeGreaterThan(0);
    expect(p.changes.length).toBeLessThanOrEqual(3);
    for (const ch of p.changes) {
      expect(ch.entity).toBe('events');
      expect(ch.after).toMatchObject({ kind: 'reading', priority: 3 });
      expect(ch.after.end_min as number - (ch.after.start_min as number)).toBeLessThanOrEqual(30);
      expect(String(ch.after.title)).toBe('Czytanie: Pani Dalloway');
    }
    const days = p.changes.map((x) => x.after.date as string).sort();
    for (let i = 1; i < days.length; i++) expect(days[i] > addDays(days[i - 1], 1)).toBe(true);
  });
  it('skips sick and free days', () => {
    const sick = Array.from({ length: 10 }, (_, i) => dayState(addDays(MONDAY, i), 'sick'));
    expect(planReading(snap({ day_states: sick }), c, { title: 'X' })).toBeNull();
  });
});

describe('library feeds the assistant', () => {
  it('lists every live book with its key, so the AI can only recommend real entries', () => {
    const t = catalogText();
    for (const b of live) expect(t, b.key).toContain(b.key);
    expect(t).not.toContain('herstand-newbiz');
  });
  it('new rows from the catalog carry the reason and a deadline when reading', () => {
    const r = newBookRow(BOOK_BY_KEY['rilke-letters'], 'reading', 'bo tak', snap(), MONDAY, 5);
    expect(r).toMatchObject({ status: 'reading', catalog_key: 'rilke-letters', reason: 'bo tak', started_at: 5 });
    expect(r.due_date).toBeTruthy();
  });
});

describe('companion and books', () => {
  const c = clock(MONDAY, 600);
  it.each([
    ['Poleć mi jakąś książkę', 'book'],
    ['Co mam teraz czytać?', 'book'],
    ['Skończyłem książkę', 'book'],
    ['Przesuń termin książki o tydzień', 'book_shift'],
    ['Nie zdążę z czytaniem, brak czasu na termin', 'book_shift'],
    ['Jestem chory przez kilka dni', 'sick'],
    ['Chcę się pouczyć śpiewu', 'learn'],
  ])('"%s" → %s', (text, intent) => expect(detectIntent(text)).toBe(intent));

  it('without AI it recommends real catalog books, with the reason and the Polish-edition status', () => {
    const r = understand('Poleć mi jakąś książkę', snap(), c, { aiAvailable: false });
    expect(r.proposal).toBeNull();
    expect(r.defer).toBeUndefined();
    expect(r.cards!.length).toBeGreaterThan(0);
    for (const card of r.cards!) expect(BOOK_BY_KEY[card.id]).toBeTruthy();
    expect(r.text).toMatch(/Lektura niczego nie obiecuje/);
    expect(r.text).toMatch(/polsku|polskie wydanie|niepotwierdzone|brak polskiego|nie sprawdzano/);
  });

  it('with AI available the question is left to the literary advisor', () => {
    expect(understand('Poleć mi jakąś książkę', snap(), c, { aiAvailable: true }).defer).toBe(true);
  });

  it('never offers a book that is already on the shelf', () => {
    const everything = snap({ books: live.map((b) => fromCat(b.key, { status: 'planned' })) });
    const r = understand('Poleć mi książkę', everything, c, { aiAvailable: false });
    expect(r.cards ?? []).toEqual([]);
    expect(r.text).toMatch(/Cały katalog/);
  });

  it('moving a deadline is a proposal, not a change', () => {
    const s = snap({ books: [fromCat('woolf-dalloway', { status: 'reading', due_date: addDays(MONDAY, 3) })] });
    const r = understand('Przesuń termin książki o tydzień', s, c);
    expect(r.proposal?.status).toBe('pending');
    expect(r.proposal?.changes[0]).toMatchObject({ entity: 'books' });
    expect(r.proposal?.changes[0].after.due_date).toBe(addDays(MONDAY, 10));
    expect(s.books[0].due_date).toBe(addDays(MONDAY, 3));
  });

  it('being ill also offers to move reading deadlines, in the same single proposal', () => {
    const s = snap({ books: [fromCat('woolf-dalloway', { status: 'reading', due_date: addDays(MONDAY, 4) })] });
    const r = understand('Jestem chory przez 3 dni', s, c);
    const entities = r.proposal!.changes.map((x) => x.entity);
    expect(entities).toContain('care');
    expect(entities).toContain('books');
    expect(r.text).toMatch(/Terminy czytania/);
  });

  it('sickness without books in progress is unchanged', () => {
    const r = understand('Jestem chory przez 3 dni', snap(), c);
    expect(r.proposal!.changes.map((x) => x.entity)).not.toContain('books');
  });
});
