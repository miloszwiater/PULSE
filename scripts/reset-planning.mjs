// One-off reset of OUTDATED PLANNING data for a single user (concept change in v3).
//
//   node scripts/reset-planning.mjs --user <user_id> [--remote] [--apply]
//
// Default is a dry run (counts only). Without --remote it targets the local D1.
// Nothing is hard-deleted: rows get deleted_at/updated_at/srv_ts = now, so every
// device removes them on its next sync and they cannot come back from a stale cache.
// Idempotent. Back up first: `wrangler d1 export pulse --remote --output backup.sql`.
//
// Removed (planning only):
//  - open development events from the old planner/mentor (source planner|mentor, or carrying
//    an exercise): kinds music/training/reading/promo with status planned|skipped|moved|excused|cancelled
//  - every plan proposal (planner | conflict | mentor), whatever its status
//  - companion/mentor chat turns that carry a proposal or exercise card (+ their paired user message)
// Kept: sessions, attempts, skill levels, projects, songs, learning, books, goals, routines and
// exceptions, work/private/other events, day states, care, profile, settings, auth, push.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const uid = args[args.indexOf('--user') + 1];
if (!uid || !/^[A-Za-z0-9_-]{8,64}$/.test(uid)) {
  console.error('Usage: node scripts/reset-planning.mjs --user <user_id> [--remote] [--apply]');
  process.exit(1);
}
const target = flag('remote') ? '--remote' : '--local';
const now = Date.now();

const OLD_EVENTS = `user_id = '${uid}' AND deleted_at IS NULL
  AND kind IN ('music','training','reading','promo')
  AND status IN ('planned','skipped','moved','excused','cancelled')
  AND (source IN ('planner','mentor') OR exercise_id IS NOT NULL)`;
const OLD_PROPOSALS = `user_id = '${uid}' AND deleted_at IS NULL AND source IN ('planner','conflict','mentor')`;
const OLD_ASSISTANT = `user_id = '${uid}' AND deleted_at IS NULL AND role = 'assistant'
  AND (proposal_id IS NOT NULL OR cards LIKE '%"type":"proposal"%' OR cards LIKE '%"type":"exercise"%')`;
const PAIRED_USER = `user_id = '${uid}' AND deleted_at IS NULL AND role = 'user'
  AND id IN (SELECT substr(id, 1, length(id) - 2) || '_u' FROM mentor_messages WHERE ${OLD_ASSISTANT})`;

function run(sql) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'pulse', target, '--json', '--command', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.slice(out.indexOf('[')))[0].results ?? [];
}
const count = (table, where) => run(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`)[0].n;

const before = {
  events: count('events', OLD_EVENTS),
  proposals: count('proposals', OLD_PROPOSALS),
  chat_assistant: count('mentor_messages', OLD_ASSISTANT),
  chat_user: count('mentor_messages', PAIRED_USER),
};
console.log(`${target} user ${uid} — to remove: ${JSON.stringify(before)}`);
for (const e of run(`SELECT date, title, exercise_id FROM events WHERE ${OLD_EVENTS} ORDER BY date`)) console.log('  event', e.date, e.title, e.exercise_id ?? '');

if (!flag('apply')) { console.log('Dry run. Add --apply to execute.'); process.exit(0); }

const mark = `deleted_at = ${now}, updated_at = ${now}, srv_ts = ${now}`;
// Order matters: the paired user messages are found through the assistant messages.
const sql = [
  `UPDATE mentor_messages SET ${mark} WHERE ${PAIRED_USER}`,
  `UPDATE mentor_messages SET ${mark} WHERE ${OLD_ASSISTANT}`,
  `UPDATE events SET ${mark} WHERE ${OLD_EVENTS}`,
  `UPDATE proposals SET ${mark} WHERE ${OLD_PROPOSALS}`,
].join(';\n');
execFileSync('npx', ['wrangler', 'd1', 'execute', 'pulse', target, '--command', sql], { stdio: ['ignore', 'ignore', 'inherit'] });

const left = {
  events: count('events', OLD_EVENTS),
  proposals: count('proposals', OLD_PROPOSALS),
  chat: count('mentor_messages', OLD_ASSISTANT),
};
console.log(`Done. Remaining matches (should be 0): ${JSON.stringify(left)}`);
