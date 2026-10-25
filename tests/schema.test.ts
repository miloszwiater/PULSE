import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { ENTITIES, ENTITY_NAMES } from '../shared/schema';
import { dueReminders } from '../shared/domain/reminders';
import { profile, routine, snap, ev } from './fixtures';

const sql = readdirSync('migrations').sort().map((f) => readFileSync(`migrations/${f}`, 'utf8')).join('\n');

function columns(table: string): Set<string> {
  const m = new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`).exec(sql);
  if (!m) throw new Error(`no table ${table}`);
  const cols = new Set(m[1].split(/,\s*/).map((c) => c.trim().split(/\s+/)[0].replace(/"/g, '')).filter(Boolean));
  for (const a of sql.matchAll(new RegExp(`ALTER TABLE ${table} ADD COLUMN "?(\\w+)"?`, 'g'))) cols.add(a[1]);
  return cols;
}

describe('schema ↔ migrations', () => {
  for (const e of ENTITY_NAMES) {
    it(`${e}: every schema field has a column`, () => {
      const cols = columns(e);
      for (const k of Object.keys(ENTITIES[e].shape)) expect(cols, `${e}.${k}`).toContain(k);
      expect(cols).toContain('srv_ts');
      expect(cols).toContain('user_id');
    });
  }
});

describe('reminder policy', () => {
  const base = Date.parse('2026-10-26T00:00:00Z'); // Monday, UTC profile
  const p = profile({ reminders: { enabled: true, morning_brief: true, session_start: true, weekly_review: true, quiet_during_work: true } });
  it('morning brief half an hour after wake', () => {
    const r = dueReminders(snap({ profile: p }), base + (p.wake_min + 31) * 60e3);
    expect(r.map((x) => x.key)).toContain('brief:2026-10-26');
  });
  it('stays quiet during work', () => {
    const s = snap({ profile: p, routines: [routine({ weekdays: [0], start_min: 420, end_min: 960 })], events: [ev({ date: '2026-10-26', start_min: 610, end_min: 700 })] });
    expect(dueReminders(s, base + 600 * 60e3)).toHaveLength(0);
  });
  it('announces a session ~15 min ahead', () => {
    const s = snap({ profile: p, events: [ev({ id: 'x1', date: '2026-10-26', start_min: 1110, end_min: 1200 })] });
    expect(dueReminders(s, base + 1100 * 60e3).map((x) => x.key)).toContain('start:x1');
  });
  it('nothing when reminders are disabled', () => {
    expect(dueReminders(snap(), base + (450 + 31) * 60e3)).toHaveLength(0);
  });
});
