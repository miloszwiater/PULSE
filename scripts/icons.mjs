// Renders PWA icons from SVG using the preinstalled Playwright Chromium.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const mark = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#05070F"/>
<g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})"><path d="M64 282 H196 L222 300 L256 150 L296 372 L322 260 L340 282 H448" fill="none" stroke="#8E6BFF" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const targets = [
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/icon-maskable-512.png', 512, 70],
  ['public/icons/apple-touch-icon.png', 180, 20],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#05070F">${mark(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  writeFileSync(file, await page.screenshot({ type: 'png', omitBackground: false }));
  console.log('wrote', file);
}
await browser.close();
