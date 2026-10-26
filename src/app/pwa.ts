import { toast } from '../ui/toast';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const offerUpdate = (w: ServiceWorker) => {
        toast('Jest nowa wersja PULSE.', 'info', {
          label: 'Odśwież',
          run: () => {
            w.postMessage({ type: 'SKIP_WAITING' });
          },
        }, 30000);
      };
      // A version that finished installing while the app was closed is applied right at launch —
      // nothing is in progress yet, so the cache never keeps an old version alive.
      if (reg.waiting && navigator.serviceWorker.controller) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        location.reload();
      });
      setInterval(() => void reg.update().catch(() => undefined), 60 * 60 * 1000);
      // iOS keeps home-screen apps suspended for days: look for a new version every time PULSE comes back.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
      });
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  });
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
