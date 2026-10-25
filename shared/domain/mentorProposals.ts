import { z } from 'zod';
import { eventSchema, type PEvent, type Proposal } from '../schema';
import { EXERCISE_BY_ID } from '../catalog/exercises';
import { hhmm, parseHHMM, plDate } from '../time';
import { RULES, dayContext } from './day';
import { alive, newId, type Snapshot } from './snapshot';

/** Shape of one change the AI mentor may propose (validated before it becomes a Proposal). */
export const mentorChangeSchema = z.object({
  action: z.enum(['move', 'shorten', 'excuse', 'add']),
  event_id: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  start: z.string().nullable(),
  minutes: z.number().int().min(15).max(300).nullable(),
  title: z.string().max(160).nullable(),
  kind: z.enum(['music', 'training', 'reading', 'promo', 'rest']).nullable(),
  exercise_id: z.string().nullable(),
});
export type MentorChange = z.infer<typeof mentorChangeSchema>;

/** Turns validated model tool input into a proposal of concrete row changes. Invalid items are dropped with a note. */
export function buildMentorProposal(snap: Snapshot, input: { title: string; rationale: string; changes: MentorChange[] }, now: number): { proposal: Proposal | null; problems: string[] } {
  const problems: string[] = [];
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  const events = alive(snap.events);
  for (const ch of input.changes.slice(0, 20)) {
    const e = ch.event_id ? events.find((x) => x.id === ch.event_id) : undefined;
    if (ch.action !== 'add' && !e) { problems.push(`nie znaleziono wydarzenia ${ch.event_id}`); continue; }
    if (e && (e.kind === 'work' || e.kind === 'commute' || e.kind === 'relationship' || e.kind === 'private')) {
      problems.push(`„${e.title}” to zobowiązanie życiowe — mentor go nie zmienia`); continue;
    }
    const before = e ? (e as unknown as Record<string, unknown>) : null;
    if (ch.action === 'excuse' && e) {
      changes.push({ entity: 'events', before, after: { ...e, status: 'excused', updated_at: now, proposal_id: pid }, label: `${e.title} (${plDate(e.date)}) → odpuszczone bez kary` });
    } else if (ch.action === 'shorten' && e && ch.minutes) {
      const end = e.start_min + Math.min(ch.minutes, e.end_min - e.start_min);
      changes.push({ entity: 'events', before, after: { ...e, end_min: end, updated_at: now, proposal_id: pid }, label: `${e.title}: skrócone do ${end - e.start_min} min` });
    } else if (ch.action === 'move' && e && ch.date && ch.start) {
      const start = parseHHMM(ch.start);
      if (start == null) { problems.push(`zła godzina ${ch.start}`); continue; }
      const len = ch.minutes ?? e.end_min - e.start_min;
      const ctx = dayContext(snap, ch.date, undefined, { ignoreEventId: e.id });
      const clash = ctx.blocks.find((b) => b.start < start + len && start < b.end);
      if (clash) { problems.push(`${plDate(ch.date)} ${ch.start} koliduje z: ${clash.title}`); continue; }
      if (ctx.mode === 'none') { problems.push(`${plDate(ch.date)}: ${ctx.reason}`); continue; }
      changes.push({ entity: 'events', before, after: { ...e, date: ch.date, start_min: start, end_min: start + len, updated_at: now, proposal_id: pid, source: 'mentor' }, label: `${e.title} → ${plDate(ch.date)} ${hhmm(start)}–${hhmm(start + len)}` });
    } else if (ch.action === 'add' && ch.date && ch.start && ch.minutes && ch.title) {
      const start = parseHHMM(ch.start);
      if (start == null) { problems.push(`zła godzina ${ch.start}`); continue; }
      const ctx = dayContext(snap, ch.date);
      const clash = ctx.blocks.find((b) => b.start < start + ch.minutes! && start < b.end);
      if (clash) { problems.push(`${plDate(ch.date)} ${ch.start} koliduje z: ${clash.title}`); continue; }
      if (ctx.mode === 'none' && ch.kind !== 'rest') { problems.push(`${plDate(ch.date)}: ${ctx.reason}`); continue; }
      const minutes = ctx.mode === 'light' && ch.kind !== 'rest' ? Math.min(ch.minutes, RULES.lightMax) : ch.minutes;
      const ex = ch.exercise_id ? EXERCISE_BY_ID[ch.exercise_id] : undefined;
      const row: PEvent = eventSchema.parse({
        id: newId('ev'), updated_at: now, kind: ch.kind ?? 'music', title: ch.title, date: ch.date, start_min: start,
        end_min: start + minutes, source: 'mentor', proposal_id: pid, exercise_id: ex?.id ?? null, category: ex?.category ?? null,
      });
      changes.push({ entity: 'events', before: null, after: row as unknown as Record<string, unknown>, label: `Nowe: ${row.title} ${plDate(row.date)} ${hhmm(row.start_min)}–${hhmm(row.end_min)}` });
    } else {
      problems.push(`niepełna zmiana (${ch.action})`);
    }
  }
  if (!changes.length) return { proposal: null, problems };
  return {
    proposal: { id: pid, updated_at: now, deleted_at: null, source: 'mentor', title: input.title.slice(0, 200), rationale: input.rationale.slice(0, 3000), changes, status: 'pending', decided_at: null },
    problems,
  };
}

