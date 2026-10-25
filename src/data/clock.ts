import { useEffect, useState } from 'react';
import { zoned } from '../../shared/time';
import type { Clock } from '../../shared/domain/snapshot';
import { useStore } from './store';

export function tzOf(): string {
  return useStore.getState().snap.profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Warsaw';
}

export function clockNow(): Clock {
  const nowMs = Date.now();
  const z = zoned(nowMs, tzOf());
  return { today: z.date, nowMin: z.minutes, nowMs };
}

/** Re-renders on an interval; also refreshes immediately when the app returns to the foreground. */
export function useClock(intervalMs = 30_000): Clock {
  const tz = useStore((s) => s.snap.profile?.timezone);
  const [c, setC] = useState(clockNow);
  useEffect(() => {
    const tick = () => setC(clockNow());
    tick();
    const id = setInterval(tick, intervalMs);
    const vis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [intervalMs, tz]);
  return c;
}
