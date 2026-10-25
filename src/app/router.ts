import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
/** In-app navigation depth, so "back" never leaves the app. */
let depth = 0;
window.addEventListener('popstate', () => {
  depth = Math.max(0, depth - 1);
  const doc = document as VTDocument;
  if (!doc.startViewTransition || reduceMotion()) { notify(); return; }
  document.documentElement.dataset.nav = 'back';
  doc.startViewTransition(() => flushSync(notify));
});

/**
 * Route changes run inside a View Transition where supported (Safari 18+,
 * Chromium): the direction attribute lets CSS slide tabs left/right and
 * push detail screens in from the right.
 */
function transition(to: string, update: () => void) {
  const doc = document as VTDocument;
  if (!doc.startViewTransition || reduceMotion()) { update(); return; }
  const from = location.pathname;
  const a = TAB_ORDER.indexOf(tabOf(from));
  const b = TAB_ORDER.indexOf(tabOf(to.split('?')[0]));
  const dir = a === b ? (to.split('?')[0].length >= from.length ? 'deeper' : 'up') : b > a ? 'next' : 'prev';
  document.documentElement.dataset.nav = dir;
  doc.startViewTransition(() => flushSync(update));
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === location.pathname + location.search) return;
  transition(path, () => {
    if (opts.replace) history.replaceState(null, '', path);
    else { history.pushState(null, '', path); depth++; }
    notify();
    window.scrollTo(0, 0);
  });
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
  { path: '/', label: 'Dziś' },
  { path: '/plan', label: 'Plan' },
  { path: '/tworz', label: 'Twórz' },
  { path: '/nauka', label: 'Nauka' },
  { path: '/ty', label: 'Ty' },
] as const;
const TAB_ORDER: string[] = TABS.map((t) => t.path);

/** Which tab a path belongs to (detail screens light up their parent tab). */
export function tabOf(path: string): string {
  if (path === '/' || path.startsWith('/towarzysz') || path.startsWith('/mentor')) return '/';
  if (path.startsWith('/sesja')) return '/tworz';
  if (path.startsWith('/projekty') || path.startsWith('/ustawienia') || path.startsWith('/profil') || path.startsWith('/care') || path.startsWith('/skupienie')) return '/ty';
  const t = TABS.find((x) => x.path !== '/' && path.startsWith(x.path));
  return t?.path ?? '/';
}
