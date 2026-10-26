// Visual QA of the turntable: Create deck → live session (playing, paused) → finished.
// Usage: node scripts/qa-session.mjs <dir>  (needs <dir>/state.json from shots.mjs)
import { chromium, devices } from '@playwright/test';
const out = process.argv[2];
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], storageState: `${out}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/401/.test(m.text())) errors.push(m.text()); });
const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/s_${n}.png` }); console.log('shot', n); };
await page.goto(BASE + '/tworz');
await page.waitForTimeout(900);
if (await page.locator('.session-pill').count()) { await page.goto(BASE + '/sesja'); await page.getByLabel('Zakończ').click(); await page.getByRole('button', { name: 'Gotowe' }).click(); await page.goto(BASE + '/tworz'); }
await page.locator('.key', { hasText: '45 min' }).click();
await page.locator('.deck .tt__deck').click();
await page.waitForURL(/sesja/);
await page.evaluate(() => { const s = Object.values(window.__pulseStore?.getState?.().rows?.sessions ?? {}); return s.length; }).catch(() => 0);
await shot('playing');
await page.getByLabel('Pauza', { exact: true }).click();
await shot('paused');
await page.getByLabel('Wznów', { exact: true }).click();
await page.goto(BASE + '/tworz'); await shot('deck_running');
await page.goto(BASE + '/sesja');
await page.getByLabel('Zakończ').click();
await shot('finished');
await page.getByRole('button', { name: 'Gotowe' }).click();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
