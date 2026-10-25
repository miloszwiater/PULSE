import { Hono } from 'hono';
import {
  BOOL_COLUMNS, ENTITIES, ENTITY_NAMES, JSON_COLUMNS, pushBodySchema,
  type EntityName, type Op, type OpResult,
} from '../shared/schema';
import { activeSeconds } from '../shared/domain/sessions';
import type { AppEnv, Env } from './env';

const META = new Set(['user_id', 'srv_ts']);

export function columnsOf(entity: EntityName): string[] {
  return Object.keys(ENTITIES[entity].shape);
}

export function toDb(entity: EntityName, row: Record<string, unknown>): unknown[] {
  const json = new Set(JSON_COLUMNS[entity] ?? []);
  const bools = new Set(BOOL_COLUMNS[entity] ?? []);
  return columnsOf(entity).map((k) => {
    const v = row[k];
    if (json.has(k)) return JSON.stringify(v ?? null);
    if (bools.has(k)) return v ? 1 : 0;
    return v === undefined ? null : v;
  });
}

export function fromDb(entity: EntityName, rec: Record<string, unknown>): Record<string, unknown> {
  const json = new Set(JSON_COLUMNS[entity] ?? []);
  const bools = new Set(BOOL_COLUMNS[entity] ?? []);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (META.has(k)) continue;
    if (json.has(k)) out[k] = typeof v === 'string' ? JSON.parse(v) : v;
    else if (bools.has(k)) out[k] = !!v;
    else out[k] = v;
  }
  return out;
}

const q = (c: string) => `"${c}"`;

function upsertSql(entity: EntityName): string {
  const cols = columnsOf(entity);
  const all = ['user_id', 'srv_ts', ...cols];
  const updates = [...cols.filter((c) => c !== 'id'), 'srv_ts'].map((c) => `${q(c)} = excluded.${q(c)}`).join(', ');
  return `INSERT INTO ${entity} (${all.map(q).join(', ')}) VALUES (${all.map(() => '?').join(', ')})
    ON CONFLICT(user_id, id) DO UPDATE SET ${updates} WHERE excluded.updated_at >= ${entity}.updated_at`;
}

/** Server-side normalisation of client rows. The server is the authority on derived values. */
function normalise(entity: EntityName, row: Record<string, unknown>): Record<string, unknown> {
  if (entity === 'profile') row.id = 'me';
  if (entity === 'sessions' && row.status === 'finished' && typeof row.ended_at === 'number') {
    row.active_seconds = activeSeconds(row as never, row.ended_at as number);
  }
  return row;
}

export async function applyOps(env: Env, userId: string, ops: Op[]): Promise<OpResult[]> {
  if (!ops.length) return [];
  const results: OpResult[] = [];
  const known = new Set<string>();
  // Idempotency: an op_id that was applied before is acknowledged without re-applying.
  for (let i = 0; i < ops.length; i += 50) {
    const chunk = ops.slice(i, i + 50);
    const rows = await env.DB.prepare(`SELECT op_id FROM op_log WHERE user_id = ? AND op_id IN (${chunk.map(() => '?').join(',')})`)
      .bind(userId, ...chunk.map((o) => o.op_id)).all<{ op_id: string }>();
    for (const r of rows.results) known.add(r.op_id);
  }
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];
  const pending: { op: Op; idx: number }[] = [];
  const seen = new Set<string>();
  for (const op of ops) {
    if (known.has(op.op_id) || seen.has(op.op_id)) { results.push({ op_id: op.op_id, status: 'duplicate' }); continue; }
    seen.add(op.op_id);
    if (op.action === 'delete') {
      stmts.push(env.DB.prepare(`UPDATE ${op.entity} SET deleted_at = ?, updated_at = ?, srv_ts = ? WHERE user_id = ? AND id = ? AND updated_at <= ?`)
        .bind(op.ts, op.ts, now, userId, op.id, op.ts));
    } else {
      const parsed = ENTITIES[op.entity].safeParse({ ...(op.data ?? {}), id: op.id });
      if (!parsed.success) {
        results.push({ op_id: op.op_id, status: 'rejected', error: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
        continue;
      }
      const row = normalise(op.entity, parsed.data as Record<string, unknown>);
      stmts.push(env.DB.prepare(upsertSql(op.entity)).bind(userId, now, ...toDb(op.entity, row)));
    }
    pending.push({ op, idx: stmts.length - 1 });
    stmts.push(env.DB.prepare('INSERT OR IGNORE INTO op_log (user_id, op_id, entity, entity_id, action, status, client_ts, applied_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, op.op_id, op.entity, op.id, op.action, 'applied', op.ts, now));
  }
  if (stmts.length) {
    const res = await env.DB.batch(stmts);
    for (const p of pending) {
      const changes = res[p.idx]?.meta?.changes ?? 0;
      // 0 changes = a newer version already exists (last-writer-wins); the op is still acknowledged.
      results.push({ op_id: p.op.op_id, status: changes > 0 ? 'applied' : 'stale' });
    }
  }
  return results;
}

export async function pull(env: Env, userId: string, since: number) {
  const out: Record<string, Record<string, unknown>[]> = {};
  let cursor = since;
  const stmts = ENTITY_NAMES.map((e) => env.DB.prepare(`SELECT * FROM ${e} WHERE user_id = ? AND srv_ts > ?${since === 0 ? ' AND deleted_at IS NULL' : ''}`).bind(userId, since));
  const res = await env.DB.batch(stmts);
  ENTITY_NAMES.forEach((e, i) => {
    const rows = (res[i].results ?? []) as Record<string, unknown>[];
    for (const r of rows) cursor = Math.max(cursor, Number(r.srv_ts));
    out[e] = rows.map((r) => fromDb(e, r));
  });
  return { rows: out, cursor, server_time: Date.now() };
}

export const syncRoutes = new Hono<AppEnv>();

syncRoutes.get('/', async (c) => {
  const since = Math.max(0, Number(c.req.query('since') ?? 0) || 0);
  return c.json(await pull(c.env, c.get('user').id, since));
});

syncRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = pushBodySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'invalid body', detail: parsed.error.issues.slice(0, 3) }, 400);
  const results = await applyOps(c.env, c.get('user').id, parsed.data.ops);
  return c.json({ results, server_time: Date.now() });
});
