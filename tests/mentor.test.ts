import { describe, expect, it } from 'vitest';
import { buildMentorProposal, type MentorChange } from '../shared/domain/mentorProposals';
import { buildMentorContext } from '../shared/domain/mentorContext';
import { songSchema, type PEvent } from '../shared/schema';
import { clock, ev, MONDAY, routine, snap, profile } from './fixtures';

const ch = (c: Partial<MentorChange>): MentorChange => ({ action: 'add', event_id: null, date: null, start: null, minutes: null, title: null, kind: null, exercise_id: null, ...c });

describe('mentor proposals are validated by rules, not trusted', () => {
  it('cannot touch work or relationship events', () => {
    const work = ev({ kind: 'work', title: 'Praca', date: MONDAY, start_min: 480, end_min: 960 });
    const r = buildMentorProposal(snap({ events: [work] }), { title: 't', rationale: '', changes: [ch({ action: 'excuse', event_id: work.id })] }, 1);
    expect(r.proposal).toBeNull();
    expect(r.problems[0]).toMatch(/zobowiązanie życiowe/);
  });

  it('rejects a move into a work shift', () => {
    const s1 = ev({ kind: 'music', date: MONDAY, start_min: 1080, end_min: 1170 });
    const s = snap({ events: [s1], routines: [routine({ weekdays: [1], start_min: 480, end_min: 960 })] });
    const r = buildMentorProposal(s, { title: 't', rationale: '', changes: [ch({ action: 'move', event_id: s1.id, date: '2026-10-27', start: '10:00' })] }, 1);
    expect(r.proposal).toBeNull();
    expect(r.problems[0]).toMatch(/koliduje/);
  });

  it('caps an added session to 30 min on a 10-hour day', () => {
    const s = snap({ routines: [routine({ weekdays: [0], start_min: 420, end_min: 1020 })] });
    const r = buildMentorProposal(s, { title: 't', rationale: '', changes: [ch({ date: MONDAY, start: '19:00', minutes: 120, title: 'Sesja', kind: 'music' })] }, 1);
    const e = r.proposal!.changes[0].after as unknown as PEvent;
    expect(e.end_min - e.start_min).toBe(30);
    expect(e.source).toBe('mentor');
    expect(r.proposal!.status).toBe('pending');
  });

  it('refuses development work on a day marked off', () => {
    const s = snap({ day_states: [{ id: MONDAY, date: MONDAY, status: 'off', note: '', updated_at: 1, deleted_at: null }] });
    const r = buildMentorProposal(s, { title: 't', rationale: '', changes: [ch({ date: MONDAY, start: '12:00', minutes: 60, title: 'Sesja', kind: 'music' })] }, 1);
    expect(r.proposal).toBeNull();
  });
});

describe('mentor context', () => {
  it('never contains song lyrics or notes', () => {
    const song = songSchema.parse({ id: 'so1', updated_at: 1, project_id: 'p1', title: 'Noc', lyrics: 'TAJNY_TEKST_123', notes: 'NOTATKA_456' });
    const txt = buildMentorContext(snap({ profile: profile(), songs: [song] }), clock());
    expect(txt).not.toContain('TAJNY_TEKST_123');
    expect(txt).not.toContain('NOTATKA_456');
  });
  it('lists event ids so proposals can reference them', () => {
    const e = ev({ id: 'ev_abc', date: MONDAY, start_min: 1080, end_min: 1170 });
    expect(buildMentorContext(snap({ events: [e] }), clock())).toContain('[ev_abc]');
  });
});
