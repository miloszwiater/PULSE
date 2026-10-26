// v3 visual QA: walks the main flows on an iPhone viewport and screenshots each state.
// Usage: node scripts/qa-v3.mjs <outDir>   (needs <outDir>/state.json from shots.mjs + onboard.mjs)
import { chromium, devices } from '@playwright/test';
const outDir = process.argv[2];
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], storageState: `${outDir}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) errors.push(m.text()); });
const shot = async (name, full = false) => { await page.waitForTimeout(700); await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full }); console.log('shot', name); };
const go = async (p) => { await page.goto(BASE + p); await page.waitForTimeout(900); };

await go('/tworz');
await page.locator('.key', { hasText: '45 min' }).click();
await page.locator('.deck .tt__deck').click();
await shot('session');
await page.getByLabel('Pauza').click();
await shot('session_paused');
await page.getByLabel('Wznów').click();
await page.getByLabel('Zakończ').click();
await shot('finished');
await page.getByRole('button', { name: 'Gotowe' }).click();
await shot('tworz_after', true);

await go('/towarzysz?q=' + encodeURIComponent('Jutro pracuję 12 godzin, przełóż muzykę'));
await page.waitForTimeout(800);
await shot('companion_work');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.locator('.composer__input').fill('Nie mam dzisiaj energii');
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
await page.keyboard.press('Escape');
await shot('companion_energy');

await go('/nauka/vocal'); await shot('path', true);
await go('/nauka/vocal/vocal-warmup'); await shot('lesson', true);
await go('/nauka'); await shot('nauka_after', true);
await go('/nauka/ksiazki'); await shot('books', true);
await go('/projekty?new=1');
await page.locator('.sheet input').fill('Nocne miasto');
await page.getByRole('button', { name: 'Utwórz', exact: true }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /Dodaj/ }).first().click();
await page.locator('.sheet input').first().fill('Neony');
await page.locator('.sheet textarea').first().fill('Pierwszy wers\nDrugi wers');
await page.getByRole('button', { name: 'Zapisz' }).click();
await shot('project', true);
await go('/projekty'); await shot('projects', true);
await go('/skupienie'); await shot('focus', true);
await go('/ty/rytm'); await shot('rhythm', true);
await go('/plan'); await shot('plan', true);
await go('/'); await shot('today_after', true);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
