import { chromium } from 'playwright-core';
const SHOTS = process.env.SHOTS_DIR || 'shots';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.env.URL || 'http://localhost:5174/', { waitUntil: 'domcontentloaded' });
for (const t of [400, 900, 1600, 2300, 3000, 3800, 4600]) {
  await page.waitForTimeout(t === 400 ? 400 : 700);
  await page.screenshot({ path: `${SHOTS}/splash-${t}.png` });
}
console.log('splashing:', await page.evaluate(() => document.documentElement.classList.contains('splashing')), 'splash el:', await page.evaluate(() => !!document.getElementById('splash')));
await browser.close();
