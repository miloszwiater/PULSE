import { useStore } from '../data/store';
import { syncNow } from '../data/sync';
import { Icon } from '../ui/Icon';
import { plural } from '../ui/format';

/** Honest sync state: shows only when something is not in sync. */
export function SyncBadge() {
  const state = useStore((s) => s.syncState);
  const pending = useStore((s) => s.outbox.length);
  const err = useStore((s) => s.lastError);
  if (state === 'idle' && pending === 0) return null;
  const offline = state === 'offline';
  const n = `${pending} ${plural(pending, 'zmiana', 'zmiany', 'zmian')}`;
  const label = offline ? `Offline — ${n} ${plural(pending, 'czeka', 'czekają', 'czeka')} na wysłanie` : state === 'error' ? `Błąd synchronizacji: ${err ?? ''}` : pending ? `Wysyłanie: ${n}` : 'Synchronizacja';
  return (
    <button className={`sync-badge${offline ? ' is-offline' : state === 'error' ? ' is-error' : ''}`} onClick={() => void syncNow()} aria-label={label} title={label}>
      <Icon name={offline ? 'cloudOff' : 'sync'} size={18} />
      {pending > 0 && <span className="num">{pending}</span>}
    </button>
  );
}
