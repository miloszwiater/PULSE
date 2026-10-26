import { POETRY } from './library/poetry';
import { PROSE } from './library/prose';
import { THOUGHT } from './library/thought';
import { CRAFT } from './library/craft';
import type { CatalogBook } from './library/types';

export * from './library/types';

/**
 * Curated, real titles. Author, title and the Polish-edition status were checked against sources
 * (see PROGRESS.md → Biblioteka). `verified: false` means some detail is still unconfirmed — the UI shows it.
 * Descriptions are spoiler-free; nothing here promises that reading improves craft.
 */
export const BOOKS: CatalogBook[] = [...POETRY, ...PROSE, ...THOUGHT, ...CRAFT];

export const BOOK_BY_KEY: Record<string, CatalogBook> = Object.fromEntries(BOOKS.map((b) => [b.key, b]));
