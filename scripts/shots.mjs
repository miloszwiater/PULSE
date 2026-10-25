// Visual QA helper: logs in (registering on first run) and screenshots routes on an iPhone-sized viewport.
// Usage: node scripts/shots.mjs <outDir> [route ...]   (routes like / /plan /tworz)
import { chromium, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const [outDir, ...routes] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:5173';
const state = `${outDir}/state.json`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], storageState: existsSync(state) ? state : undefined, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(BASE + '/');
await page.waitForTimeout(800);
if (await page.locator('.auth').count()) {
  const email = process.env.EMAIL ?? 'artist@pulse.local';
  const pass = process.env.PASS ?? 'tajne-haslo-123';
  if (await page.getByLabel('Imię lub pseudonim').count()) await page.getByLabel('Imię lub pseudonim').fill('Miłosz');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Hasło').fill(pass);
  await page.locator('form button.btn--primary').click();
  await page.waitForTimeout(1200);
}
await ctx.storageState({ path: state });
for (const r of routes.length ? routes : ['/']) {
  const [path, action] = r.split('#');
  if (path !== 'current') await page.goto(BASE + path);
  await page.waitForTimeout(900);
  if (action) await page.evaluate(action);
  await page.waitForTimeout(400);
  const name = (path === '/' ? 'start' : path.replace(/[^a-z0-9]+/gi, '_')) + (action ? '_a' : '');
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log('shot', name);
}
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
