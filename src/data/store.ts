/**
 * Local-first store. Every write is applied locally, persisted to IndexedDB
 * and queued in an outbox of idempotent operations (client op_id). The sync
 * loop pushes the outbox and pulls server changes. The server deduplicates
 * by op_id, so retries after a lost response never double anything.
 */
import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { ENTITIES, ENTITY_NAMES, type EntityName, type EntityRows, type Op } from '../../shared/schema';
import { emptySnapshot, newId, type Snapshot } from '../../shared/domain/snapshot';

type Rows = { [K in EntityName]: Record<string, EntityRows[K]> };

export interface AuthUser { id: string; email: string; name: string }

interface State {
  ready: boolean;
  user: AuthUser | null;
  rows: Rows;
  snap: Snapshot;
  outbox: Op[];
  cursor: number;
  syncState: 'idle' | 'syncing' | 'offline' | 'error';
  lastSyncedAt: number | null;
  lastError: string | null;
}

const emptyRows = (): Rows => Object.fromEntries(ENTITY_NAMES.map((e) => [e, {}])) as unknown as Rows;

function toSnapshot(rows: Rows): Snapshot {
  const s = emptySnapshot();
  const live = <T extends { deleted_at: number | null }>(r: Record<string, T>) => Object.values(r).filter((x) => x.deleted_at == null);
  s.profile = rows.profile.me && rows.profile.me.deleted_at == null ? rows.profile.me : null;
  for (const e of ENTITY_NAMES) {
    if (e === 'profile' || e === 'mentor_messages') continue;
    (s as unknown as Record<string, unknown>)[e] = live(rows[e] as Record<string, { deleted_at: number | null }>);
  }
  return s;
}

export const useStore = create<State>(() => ({
  ready: false,
  user: null,
  rows: emptyRows(),
  snap: emptySnapshot(),
  outbox: [],
  cursor: 0,
  syncState: 'idle',
  lastSyncedAt: null,
  lastError: null,
}));

const KEY = (uid: string, k: string) => `pulse:${uid}:${k}`;

/**
 * Persist right away (coalesced): a write must survive the app being killed
 * a moment later, e.g. right after "Zapisz sesję".
 */
let persisting: Promise<void> | null = null;
let persistAgain = false;
function schedulePersist() {
  if (persisting) { persistAgain = true; return; }
  persisting = (async () => {
    do { persistAgain = false; await writeState(); } while (persistAgain);
  })().finally(() => { persisting = null; });
}
export async function persistNow() {
  schedulePersist();
  await persisting;
}
async function writeState() {
  const { user, rows, outbox, cursor } = useStore.getState();
  if (!user) return;
  await Promise.all([
    idbSet(KEY(user.id, 'rows'), rows),
    idbSet(KEY(user.id, 'outbox'), outbox),
    idbSet(KEY(user.id, 'cursor'), cursor),
    idbSet('pulse:lastUser', user),
  ]).catch(() => undefined);
}

export async function loadLocal(user: AuthUser) {
  const [rows, outbox, cursor] = await Promise.all([
    idbGet<Rows>(KEY(user.id, 'rows')),
    idbGet<Op[]>(KEY(user.id, 'outbox')),
    idbGet<number>(KEY(user.id, 'cursor')),
  ]).catch(() => [undefined, undefined, undefined] as const);
  const merged = { ...emptyRows(), ...(rows ?? {}) } as Rows;
  useStore.setState({ user, rows: merged, snap: toSnapshot(merged), outbox: outbox ?? [], cursor: cursor ?? 0, ready: true });
  void idbSet('pulse:lastUser', user).catch(() => undefined);
}

export async function lastUser(): Promise<AuthUser | null> {
  return (await idbGet<AuthUser>('pulse:lastUser').catch(() => undefined)) ?? null;
}

export async function clearLocal() {
  const { user } = useStore.getState();
  if (user) await Promise.all(['rows', 'outbox', 'cursor'].map((k) => idbDel(KEY(user.id, k)))).catch(() => undefined);
  await idbDel('pulse:lastUser').catch(() => undefined);
  useStore.setState({ user: null, rows: emptyRows(), snap: emptySnapshot(), outbox: [], cursor: 0, ready: true });
}

let onWrite: (() => void) | null = null;
export function setWriteListener(fn: () => void) { onWrite = fn; }

export interface Write<K extends EntityName = EntityName> {
  entity: K;
  row?: EntityRows[K];
  deleteId?: string;
}

/**
 * Apply several row writes atomically to local state and queue them.
 * Rows are validated with the shared schema before anything is stored.
 */
export function commit(writes: Write[]) {
  const now = Date.now();
  const state = useStore.getState();
  const rows = { ...state.rows };
  const ops: Op[] = [];
  for (const w of writes) {
    const table = { ...(rows[w.entity] as Record<string, unknown>) };
    if (w.deleteId) {
      const cur = table[w.deleteId] as { updated_at: number } | undefined;
      if (cur) table[w.deleteId] = { ...cur, deleted_at: now, updated_at: Math.max(now, cur.updated_at + 1) };
      ops.push({ op_id: newId('op'), entity: w.entity, action: 'delete', id: w.deleteId, ts: now });
    } else if (w.row) {
      const parsed = ENTITIES[w.entity].parse({ ...w.row, updated_at: Math.max(now, (w.row as { updated_at?: number }).updated_at ?? 0) });
      table[parsed.id] = parsed;
      ops.push({ op_id: newId('op'), entity: w.entity, action: 'put', id: parsed.id, data: parsed as Record<string, unknown>, ts: now });
    }
    (rows as Record<string, unknown>)[w.entity] = table;
  }
  // Coalesce: a newer put/delete for the same row supersedes a queued, not-yet-sent op.
  const inflight = inflightIds;
  const keep = state.outbox.filter((o) => inflight.has(o.op_id) || !ops.some((n) => n.entity === o.entity && n.id === o.id));
  useStore.setState({ rows, snap: toSnapshot(rows), outbox: [...keep, ...ops] });
  schedulePersist();
  onWrite?.();
}

export function put<K extends EntityName>(entity: K, row: EntityRows[K]) {
  commit([{ entity, row } as Write]);
}

export function remove(entity: EntityName, id: string) {
  commit([{ entity, deleteId: id }]);
}

export const inflightIds = new Set<string>();

/** Merge rows pulled from the server. Rows with a pending local op win until acknowledged. */
export function mergeRemote(remote: Partial<Record<EntityName, Record<string, unknown>[]>>, cursor: number) {
  const state = useStore.getState();
  const pending = new Set(state.outbox.map((o) => `${o.entity}:${o.id}`));
  const rows = { ...state.rows };
  let changed = false;
  for (const e of ENTITY_NAMES) {
    const list = remote[e];
    if (!list?.length) continue;
    const table = { ...(rows[e] as Record<string, { updated_at: number }>) };
    for (const r of list) {
      const id = String(r.id);
      if (pending.has(`${e}:${id}`)) continue;
      const cur = table[id];
      if (cur && cur.updated_at > Number(r.updated_at)) continue;
      const parsed = ENTITIES[e].safeParse(r);
      if (!parsed.success) continue;
      table[id] = parsed.data as { updated_at: number };
      changed = true;
    }
    (rows as Record<string, unknown>)[e] = table;
  }
  useStore.setState(changed ? { rows, snap: toSnapshot(rows), cursor } : { cursor });
  schedulePersist();
}

export function ackOps(opIds: string[]) {
  const set = new Set(opIds);
  useStore.setState((s) => ({ outbox: s.outbox.filter((o) => !set.has(o.op_id)) }));
  schedulePersist();
}

export const useSnap = () => useStore((s) => s.snap);
export const useProfile = () => useStore((s) => s.snap.profile);
export function useRow<K extends EntityName>(entity: K, id: string | null | undefined): EntityRows[K] | undefined {
  return useStore((s) => (id ? (s.rows[entity] as Record<string, EntityRows[K]>)[id] : undefined));
}
export const useMentorMessages = () => useStore((s) => s.rows.mentor_messages);
