// Full-page audit with the seeded rich account (scripts/seed-qa.ts) in real WebKit (Safari engine) or Chromium.
// Usage: node scripts/qa-rich.mjs <dir> [webkit|chromium] [width]   (<dir>/state.json from seed-qa.ts)
import { chromium, webkit, devices } from '@playwright/test';
const [out, engine = 'webkit', width = '390'] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const W = Number(width);
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: W, height: Math.round(W * 2.16) }, storageState: `${out}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errors.push(m.text()); });
const ROUTES = process.env.ROUTES?.split(',') ?? ['/', '/plan', '/plan?v=week', '/plan?v=month', '/tworz', '/nauka', '/nauka/vocal', '/nauka/theory/theory-rhythm', '/nauka/ksiazki', '/ty', '/ty/rytm', '/towarzysz', '/skupienie', '/care', '/ustawienia', '/projekty', '/projekty/pj1', '/profil'];
const bad = [];
for (const r of ROUTES) {
  await page.goto(BASE + r); await page.waitForTimeout(1100);
  const info = await page.evaluate(() => {
    const de = document.documentElement; const vw = de.clientWidth;
    const off = [];
    for (const el of document.querySelectorAll('body *')) {
      const b = el.getBoundingClientRect();
      if (!b.width || b.right <= vw + 1) continue;
      if (el.closest('.chipscroll, .talk__prompts, .composer__quick, .sheet-layer, .screenhero, .pathhero, .hero-bg, .auth__photo, .sleeve, .profile__hero, .tt::before')) continue;
      off.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} →${Math.round(b.right)}`); if (off.length > 4) break;
    }
    // Absolutely positioned boxes that escaped their parent's box (the classic collapsed-container bug)
    const escaped = [];
    for (const el of document.querySelectorAll('.timeline > *, .tblock')) {
      const p = el.parentElement.getBoundingClientRect(); const b = el.getBoundingClientRect();
      if (p.height < 40 || b.top > p.bottom + 2 || b.bottom < p.top - 2) escaped.push(`${[...el.classList].join('.')} parent h=${Math.round(p.height)}`);
      if (escaped.length > 2) break;
    }
    return { over: de.scrollWidth - vw, off, escaped, h: de.scrollHeight };
  });
  if (info.over > 0 || info.off.length || info.escaped.length) bad.push(`${r}: +${info.over}px ${info.off.join(' | ')} ${info.escaped.join(' | ')}`);
  await page.screenshot({ path: `${out}/${engine}_${W}_${r.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true });
}
console.log(`[${engine} ${W}px]`, bad.length ? 'LAYOUT:\n' + bad.join('\n') : 'layout ok');
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
await browser.close();
