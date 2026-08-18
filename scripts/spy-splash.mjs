import { chromium } from 'playwright-core';
const SHOTS = process.env.SHOTS_DIR || 'shots';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.env.URL || 'http://localhost:5174/?slow=4', { waitUntil: 'domcontentloaded' });
let last = 0;
for (const t of [300, 1200, 2200, 3200, 4200, 5400, 6600, 8000, 9500, 11500, 14000, 17000, 20000]) {
  await page.waitForTimeout(t - last); last = t;
  await page.screenshot({ path: `${SHOTS}/splash-${t}.png` });
}
console.log('splashing:', await page.evaluate(() => document.documentElement.classList.contains('splashing')), 'splash el:', await page.evaluate(() => !!document.getElementById('splash')));
await browser.close();
