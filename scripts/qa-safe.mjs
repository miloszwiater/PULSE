// Standalone-PWA simulation: iPhone safe areas (notch + home indicator) injected, viewport-only screenshots.
// Usage: node scripts/qa-safe.mjs <dir> [route,route…]   (<dir>/state.json from seed-qa.ts)
import { webkit, devices } from '@playwright/test';
const out = process.argv[2];
const BASE = process.env.BASE ?? 'http://localhost:5173';
const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 14 Pro'], storageState: `${out}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const p = await ctx.newPage();
const routes = (process.argv[3] ?? '/,/plan,/tworz,/nauka,/ty,/towarzysz,/sesja,/nauka/vocal/vocal-warmup,/projekty/pj1').split(',');
for (const r of routes) {
  await p.goto(BASE + r); await p.addStyleTag({ content: ':root{--safe-top:59px !important;--safe-bottom:34px !important}' }); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/safe_${r.replace(/[^a-z0-9]+/gi, '_')}.png` });
}
// Sheet and keyboard-ish: open the event sheet, then focus the notes field
await p.goto(BASE + '/plan'); await p.addStyleTag({ content: ':root{--safe-top:59px !important;--safe-bottom:34px !important}' }); await p.waitForTimeout(800);
await p.getByLabel('Dodaj do planu').click(); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/safe_sheet.png` });
await b.close();
console.log('ok');
