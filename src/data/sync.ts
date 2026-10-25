import type { OpResult } from '../../shared/schema';
import { api, ApiError } from './api';
import { ackOps, inflightIds, mergeRemote, setWriteListener, useStore } from './store';
import { toast } from '../ui/toast';

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Push the outbox, then pull changes. Never runs twice in parallel. */
export function syncNow(): Promise<void> {
  if (running) { again = true; return running; }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => { running = null; });
  return running;
}

async function syncOnce() {
  const st = useStore.getState();
  if (!st.user) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    useStore.setState({ syncState: 'offline' });
    return;
  }
  useStore.setState({ syncState: 'syncing' });
  try {
    // push in chunks
    for (;;) {
      const batch = useStore.getState().outbox.filter((o) => !inflightIds.has(o.op_id)).slice(0, 100);
      if (!batch.length) break;
      batch.forEach((o) => inflightIds.add(o.op_id));
      try {
        const res = await api<{ results: OpResult[] }>('/api/sync', { body: { ops: batch } });
        const rejected = res.results.filter((r) => r.status === 'rejected');
        if (rejected.length) {
          console.warn('Rejected ops', rejected);
          toast(`Serwer odrzucił ${rejected.length} zmian(y) — dane nie przeszły walidacji.`, 'error');
        }
        ackOps(res.results.map((r) => r.op_id));
      } finally {
        batch.forEach((o) => inflightIds.delete(o.op_id));
      }
    }
    const since = Math.max(0, useStore.getState().cursor - 2000);
    const pulled = await api<{ rows: Record<string, Record<string, unknown>[]>; cursor: number }>(`/api/sync?since=${since}`);
    mergeRemote(pulled.rows, Math.max(pulled.cursor, useStore.getState().cursor));
    useStore.setState({ syncState: 'idle', lastSyncedAt: Date.now(), lastError: null });
  } catch (e) {
    const err = e as ApiError;
    if (err.status === 401) {
      useStore.setState({ syncState: 'error', lastError: 'Sesja wygasła — zaloguj się ponownie.' });
      window.dispatchEvent(new CustomEvent('pulse:unauthorized'));
      return;
    }
    useStore.setState({ syncState: err.status === 0 ? 'offline' : 'error', lastError: err.message });
  }
}

export function scheduleSync(delay = 700) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

export function startSyncLoop() {
  setWriteListener(() => scheduleSync());
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => useStore.setState({ syncState: 'offline' }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void syncNow();
  }, 60_000);
  void syncNow();
}
