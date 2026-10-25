import { useStore } from '../data/store';
import { useClock } from '../data/clock';
import { activeSeconds, isPaused } from '../../shared/domain/sessions';
import { navigate } from './router';
import { formatTimer } from '../ui/format';

export function ActiveSessionPill() {
  const s = useStore((st) => Object.values(st.rows.sessions).find((x) => x.deleted_at == null && (x.status === 'running' || x.status === 'paused')));
  const clock = useClock(1000);
  if (!s) return null;
  const paused = isPaused(s);
  return (
    <button className={`session-pill${paused ? ' is-paused' : ''}`} onClick={() => navigate('/sesja')}>
      <span className="session-pill__dot" aria-hidden="true" />
      <span className="session-pill__time num">{formatTimer(activeSeconds(s, clock.nowMs))}</span>
      <span className="session-pill__label">{paused ? 'Sesja wstrzymana' : 'Sesja trwa'} — wróć</span>
    </button>
  );
}
