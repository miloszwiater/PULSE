import { useEffect, useState } from 'react';
import { get, set, del } from 'idb-keyval';

/** Optional personal background photo — stored only on this device (IndexedDB), never uploaded. */
const KEY = 'pulse:heroPhoto';
let cache: string | null | undefined;
const subs = new Set<(v: string | null) => void>();

export function useHeroPhoto(): string | null {
  const [v, setV] = useState<string | null>(cache ?? null);
  useEffect(() => {
    subs.add(setV);
    if (cache === undefined) get<string>(KEY).then((x) => { cache = x ?? null; subs.forEach((f) => f(cache!)); }).catch(() => { cache = null; });
    return () => { subs.delete(setV); };
  }, []);
  return v;
}

export async function setHeroPhoto(file: File | null) {
  if (!file) { await del(KEY); cache = null; subs.forEach((f) => f(null)); return; }
  const url = await downscale(file, 1200);
  await set(KEY, url);
  cache = url;
  subs.forEach((f) => f(url));
}

async function downscale(file: File, max: number): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

/** Project cover: centre square crop, small JPEG data URL that syncs with the project row. */
export async function coverFromFile(file: File, size = 480): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  let q = 0.8;
  let url = c.toDataURL('image/jpeg', q);
  while (url.length > 200_000 && q > 0.4) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
  return url;
}
