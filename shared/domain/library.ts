import type { Book, BookStatus } from '../schema';
import { addDays } from '../time';
import { dayContext } from './day';
import type { Snapshot } from './snapshot';

export const BOOK_STATUS_LABEL: Record<BookStatus, string> = {
  planned: 'Planowana',
  bought: 'Kupiona',
  reading: 'Czytam',
  read: 'Przeczytana',
  paused: 'Odłożona',
  dropped: 'Rezygnuję',
};

/** Forward path; "bought" is optional and can be skipped. */
export const BOOK_FLOW: BookStatus[] = ['planned', 'bought', 'reading', 'read'];

export interface DeadlineSuggestion { due: string; weeks: number; explanation: string }

/**
 * Flexible deadline: estimated reading hours (≈25 pages/h) spread over the
 * reading time the next 4 weeks realistically allow (~20 min on days with
 * any capacity, nothing on sick/off days), plus one week of slack.
 */
export function suggestDeadline(snap: Snapshot, book: Pick<Book, 'pages'>, today: string): DeadlineSuggestion {
  const pages = book.pages ?? 250;
  const hours = pages / 25;
  let readingDays = 0;
  for (let i = 0; i < 28; i++) {
    const ctx = dayContext(snap, addDays(today, i));
    if (ctx.status === 'sick' || ctx.status === 'off' || ctx.status === 'vacation') continue;
    if (ctx.windows.length) readingDays++;
  }
  const minutesPerWeek = Math.max(60, (readingDays / 4) * 20);
  const weeks = Math.ceil((hours * 60) / minutesPerWeek) + 1;
  return {
    due: addDays(today, weeks * 7),
    weeks,
    explanation: `ok. ${pages} stron ≈ ${Math.round(hours)} h czytania; przy ~${Math.round(minutesPerWeek)} min tygodniowo daje to ${weeks - 1} tyg. + tydzień zapasu. Termin jest orientacyjny — nie ma kar za przekroczenie.`,
  };
}
