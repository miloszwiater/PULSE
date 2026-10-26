import type { PathKey } from '../academy';

export type LibraryCategory =
  | 'poetry_pl' | 'poetry_world' | 'novel' | 'existential' | 'contemporary'
  | 'language' | 'narrative' | 'philosophy' | 'psychology' | 'creativity'
  | 'songwriting' | 'biography' | 'theory' | 'voice' | 'production' | 'business';

export const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  poetry_pl: 'Poezja polska', poetry_world: 'Poezja światowa', novel: 'Powieść psychologiczna', existential: 'Egzystencjalizm',
  contemporary: 'Proza współczesna', language: 'Język i obraz', narrative: 'Opowiadanie historii', philosophy: 'Filozofia',
  psychology: 'Psychologia', creativity: 'Twórczość', songwriting: 'Pisanie piosenek', biography: 'Biografie artystów',
  theory: 'Teoria muzyki i rapu', voice: 'Głos', production: 'Produkcja', business: 'Branża',
};

/** What a book develops. Used for the library filters, for taste and for keeping recommendations varied. */
export type Skill =
  | 'imagery' | 'metaphor' | 'ambiguity' | 'language' | 'storytelling' | 'implicit_emotion' | 'character'
  | 'existential' | 'poetry' | 'style' | 'symbolism' | 'rhythm' | 'songwriting' | 'creative_process'
  | 'mind' | 'voice' | 'production';

export const SKILL_LABEL: Record<Skill, string> = {
  imagery: 'obraz', metaphor: 'metafora', ambiguity: 'wieloznaczność', language: 'język', storytelling: 'opowiadanie historii',
  implicit_emotion: 'emocja bez nazywania', character: 'psychologia postaci', existential: 'pytania egzystencjalne', poetry: 'poezja',
  style: 'własny styl', symbolism: 'symbol', rhythm: 'rytm i brzmienie', songwriting: 'pisanie piosenek', creative_process: 'proces twórczy',
  mind: 'działanie umysłu', voice: 'głos', production: 'produkcja',
};

/**
 * Polish edition status. Only `orig` and `verified` are shown as facts.
 *  orig        — Polish-language original
 *  verified    — a Polish edition was confirmed in sources (existence, not current availability)
 *  unconfirmed — a Polish edition may exist, but it was not confirmed
 *  none        — no Polish edition found when checked
 *  unchecked   — not checked (specialist English-language literature)
 */
export type PlStatus = 'orig' | 'verified' | 'unconfirmed' | 'none' | 'unchecked';

export const PL_LABEL: Record<PlStatus, string> = {
  orig: 'po polsku (polski oryginał)',
  verified: 'jest polskie wydanie',
  unconfirmed: 'polskie wydanie: niepotwierdzone',
  none: 'brak polskiego wydania (nie znaleziono)',
  unchecked: 'polskie wydanie: nie sprawdzano',
};

export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: 'lekka', 2: 'średnia', 3: 'wymagająca' };

export interface CatalogBook {
  key: string;
  /** Polish title when a Polish edition is verified, otherwise the original one. */
  title: string;
  original?: string;
  author: string;
  year?: number;
  category: LibraryCategory;
  /** Short topic line (derived from the skills). */
  topic: string;
  /** Approximate length. Only used to estimate reading time — not shown as bibliographic fact. */
  pages: number;
  difficulty: Difficulty;
  skills: Skill[];
  /** Spoiler-free description. */
  summary: string;
  /** What to look for / the perspective the book gives. */
  learning_goal: string;
  /** Why it suits an emotional, layered songwriter (not a promise of improvement). */
  why: string;
  /** Optional reflection prompt. Never a writing task. */
  reflect?: string;
  paths: PathKey[];
  pl: PlStatus;
  /** Verified edition detail, only when a source confirmed it. */
  pl_note?: string;
  /** Author, title and the facts above were confirmed in sources. */
  verified: boolean;
  /** What was not confirmed, shown next to the "to check" tag. */
  unverified_note?: string;
  /** Read by dipping in, not cover to cover (reference, essays, letters). */
  dip?: boolean;
  /** Short content note. */
  warn?: string;
  /** Kept for existing library entries, no longer recommended. */
  retired?: boolean;
}

/** Compact form used by the catalog files. */
export interface Raw {
  k: string; t: string; a: string; c: LibraryCategory; d: Difficulty; p: number; s: Skill[];
  sum: string; why: string; goal: string;
  y?: number; o?: string; pl: PlStatus; n?: string; v?: false | string; dip?: true; warn?: string; paths?: PathKey[]; ref?: string; retired?: true;
}

export function book(r: Raw): CatalogBook {
  return {
    key: r.k, title: r.t, original: r.o, author: r.a, year: r.y, category: r.c,
    topic: r.s.slice(0, 3).map((x) => SKILL_LABEL[x]).join(', '),
    pages: r.p, difficulty: r.d, skills: r.s, summary: r.sum, learning_goal: r.goal, why: r.why, reflect: r.ref,
    paths: r.paths ?? [], pl: r.pl, pl_note: r.n,
    verified: r.v === undefined, unverified_note: typeof r.v === 'string' ? r.v : undefined,
    dip: r.dip, warn: r.warn, retired: r.retired,
  };
}
