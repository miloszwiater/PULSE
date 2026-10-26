// v4 visual audit: auth (logged out), sheets, and every main route at several phone widths with an overflow check.
// Usage: node scripts/qa-v4.mjs <dir>  (needs <dir>/state.json from shots.mjs)
import { chromium, devices } from '@playwright/test';
const out = process.argv[2];
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const errors = [];
const watch = (page) => {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errors.push(m.text()); });
};
// Logged out
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'pl-PL' });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE + '/'); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/a_auth.png` });
  await ctx.close();
}
const ROUTES = ['/', '/plan', '/plan?v=week', '/plan?v=month', '/tworz', '/nauka', '/nauka/vocal', '/nauka/theory/theory-rhythm', '/nauka/ksiazki', '/ty', '/ty/rytm', '/towarzysz', '/skupienie', '/care', '/ustawienia', '/projekty', '/profil'];
const SIZES = [[320, 568], [375, 667], [390, 844], [430, 932]];
const bad = [];
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, storageState: `${out}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
  const page = await ctx.newPage(); watch(page);
  for (const r of ROUTES) {
    await page.goto(BASE + r); await page.waitForTimeout(700);
    const o = await page.evaluate(() => {
      const de = document.documentElement;
      const over = de.scrollWidth - de.clientWidth;
      // Elements that stick out of the viewport horizontally (ignoring intentional horizontal scrollers)
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= de.clientWidth + 1) continue;
        if (el.closest('.chipscroll, .talk__prompts, .composer__quick, .sheet-layer, .screenhero, .pathhero, .hero-bg, .auth__photo, .sleeve, .profile__hero')) continue;
        offenders.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        if (offenders.length > 3) break;
      }
      return { over, offenders };
    });
    if (o.over > 0 || o.offenders.length) bad.push(`${w}px ${r}: +${o.over}px ${o.offenders.join(' ')}`);
    if (w === 320) await page.screenshot({ path: `${out}/w320_${r.replace(/[^a-z0-9]+/gi, '_')}.png` });
  }
  await ctx.close();
}
// Sheets
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'], storageState: `${out}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
  const page = await ctx.newPage(); watch(page);
  await page.goto(BASE + '/plan'); await page.waitForTimeout(800);
  await page.getByLabel('Dodaj do planu').click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/sh_event.png` });
  await page.goto(BASE + '/nauka/ksiazki'); await page.waitForTimeout(800);
  await page.getByRole('tab', { name: 'Polecane' }).click(); await page.waitForTimeout(400);
  await page.locator('.shelf__item').first().click(); await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/sh_book.png` });
  await ctx.close();
}
console.log(bad.length ? 'LAYOUT:\n' + bad.join('\n') : 'layout ok');
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no errors');
await browser.close();
