import { parseDate, weekday } from '../../shared/time';
import type { EventKind, EventStatus, Outcome, ProjectStage, SessionType } from '../../shared/schema';

export function formatTimer(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
export const WEEKDAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
export const WD_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export function longDate(d: string): string {
  const { m, d: day } = parseDate(d);
  return `${WEEKDAYS[weekday(d)]}, ${day} ${MONTHS_GEN[m - 1]}`;
}
export function shortDate(d: string): string {
  const { m, d: day } = parseDate(d);
  return `${day} ${MONTHS_GEN[m - 1].slice(0, 3)}`;
}
export function dayLabel(d: string, today: string): string {
  if (d === today) return 'Dziś';
  const { y, m, d: dd } = parseDate(today);
  const t = Date.UTC(y, m - 1, dd);
  const p = parseDate(d);
  const diff = Math.round((Date.UTC(p.y, p.m - 1, p.d) - t) / 86400000);
  if (diff === 1) return 'Jutro';
  if (diff === -1) return 'Wczoraj';
  return `${WD_SHORT[weekday(d)]} ${shortDate(d)}`;
}

export const KIND_LABEL: Record<EventKind, string> = {
  work: 'Praca', commute: 'Dojazd', music: 'Muzyka', training: 'Trening', reading: 'Czytanie', promo: 'Promocja',
  private: 'Sprawy prywatne', relationship: 'Relacje', sport: 'Ruch', rest: 'Odpoczynek', other: 'Inne',
};
export const STATUS_LABEL: Record<EventStatus, string> = {
  planned: 'Zaplanowane', done: 'Zrobione', partial: 'Częściowo', skipped: 'Pominięte', moved: 'Przeniesione',
  excused: 'Usprawiedliwione', covered: 'Pokryte sesją', cancelled: 'Odwołane',
};
export const OUTCOME_LABEL: Record<Outcome, string> = {
  none: 'Bez konkretnego wyniku', idea: 'Pomysł', verses: 'Wersy', hook: 'Refren', demo: 'Demo', recording: 'Nagranie',
  mix: 'Miks', finished: 'Ukończony utwór', exercise: 'Wykonane ćwiczenie', notes: 'Notatki',
};
export const TYPE_LABEL: Record<SessionType, string> = {
  create: 'Tworzenie', record: 'Nagrywanie', write: 'Pisanie do beatu', flow: 'Flow', inspiration: 'Inspiracja',
  experiment: 'Eksperyment', production: 'Produkcja', training: 'Trening', other: 'Inne',
};
export const STAGE_LABEL: Record<ProjectStage, string> = {
  idea: 'Pomysł', sketch: 'Szkic', demo: 'Demo', recording: 'Nagranie', mix: 'Miks', ready: 'Gotowy', released: 'Wydany',
};
export const kindVar = (k: EventKind) => `var(--k-${k})`;

export function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n === 1) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}
