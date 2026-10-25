import type { EntityName, Proposal } from '../schema';

export interface RowWrite {
  entity: EntityName;
  action: 'put' | 'delete';
  id: string;
  row?: Record<string, unknown>;
}

type Lookup = (entity: EntityName, id: string) => Record<string, unknown> | undefined;

/** Writes needed to apply a proposal. Rows get a fresh updated_at so they win LWW. */
export function applyWrites(p: Proposal, now: number): RowWrite[] {
  const writes: RowWrite[] = p.changes.map((c) => ({
    entity: c.entity as EntityName, action: 'put', id: String(c.after.id), row: { ...c.after, updated_at: now, proposal_id: p.id },
  }));
  writes.push({ entity: 'proposals', action: 'put', id: p.id, row: { ...p, status: 'applied', decided_at: now, updated_at: now } });
  return writes;
}

export interface RevertPlan {
  writes: RowWrite[];
  /** Rows edited after the proposal was applied; reverting would overwrite those edits. */
  drifted: string[];
}

export function revertWrites(p: Proposal, now: number, lookup: Lookup): RevertPlan {
  const writes: RowWrite[] = [];
  const drifted: string[] = [];
  for (const c of [...p.changes].reverse()) {
    const id = String(c.after.id);
    const cur = lookup(c.entity as EntityName, id);
    if (cur && p.decided_at != null && Number(cur.updated_at) > p.decided_at) drifted.push(c.label);
    if (c.before == null) {
      writes.push({ entity: c.entity as EntityName, action: 'delete', id });
    } else {
      writes.push({ entity: c.entity as EntityName, action: 'put', id, row: { ...c.before, updated_at: now } });
    }
  }
  writes.push({ entity: 'proposals', action: 'put', id: p.id, row: { ...p, status: 'reverted', decided_at: now, updated_at: now } });
  return { writes, drifted };
}

export function rejectWrites(p: Proposal, now: number): RowWrite[] {
  return [{ entity: 'proposals', action: 'put', id: p.id, row: { ...p, status: 'rejected', decided_at: now, updated_at: now } }];
}
