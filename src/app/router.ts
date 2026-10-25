import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
/** In-app navigation depth, so "back" never leaves the app. */
let depth = 0;
window.addEventListener('popstate', () => { depth = Math.max(0, depth - 1); notify(); });

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === location.pathname + location.search) return;
  if (opts.replace) history.replaceState(null, '', path);
  else { history.pushState(null, '', path); depth++; }
  notify();
  window.scrollTo(0, 0);
}

export function back(fallback = '/') {
  if (depth > 0) history.back();
  else navigate(fallback, { replace: true });
}

export function usePath(): string {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => location.pathname,
  );
}

export function useQuery(): URLSearchParams {
  const search = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => location.search,
  );
  return new URLSearchParams(search);
}

export const TABS = [
  { path: '/', label: 'Start' },
  { path: '/plan', label: 'Plan' },
  { path: '/tworz', label: 'Twórz' },
  { path: '/rozwoj', label: 'Rozwój' },
  { path: '/kariera', label: 'Kariera' },
] as const;

export function tabOf(path: string): string {
  if (path === '/') return '/';
  const t = TABS.find((x) => x.path !== '/' && path.startsWith(x.path));
  return t?.path ?? '/';
}
