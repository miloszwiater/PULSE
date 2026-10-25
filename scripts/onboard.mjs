// Completes onboarding for the QA account (idempotent: skips when already done).
import { chromium, devices } from '@playwright/test';
const outDir = process.argv[2];
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], storageState: `${outDir}/state.json`, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(BASE + '/');
await page.waitForTimeout(1000);
let i = 0;
while (await page.locator('.onb').count() && i < 8) {
  await page.screenshot({ path: `${outDir}/onb_${i}.png`, fullPage: true });
  await page.locator('.onb__foot .btn--primary').click();
  await page.waitForTimeout(500);
  i++;
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/after_onb.png`, fullPage: true });
await ctx.storageState({ path: `${outDir}/state.json` });
console.log('steps', i, errors.join('\n'));
await browser.close();
