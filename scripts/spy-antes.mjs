import { chromium } from 'playwright-core';
const SHOTS = process.env.SHOTS_DIR || 'shots';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto((process.env.URL || 'http://localhost:5174/') + '?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const inf = await page.evaluate(() => {
  const s = document.querySelector('#plantilla');
  return { top: s.getBoundingClientRect().top + window.scrollY, h: s.offsetHeight - window.innerHeight };
});
for (const f of [0.2, 0.5, 0.95]) {
  await page.evaluate((v) => window.scrollTo(0, v), inf.top + inf.h * f);
  await page.waitForTimeout(1500);
  await page.mouse.move(700, 500);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/antes-${Math.round(f * 100)}.png` });
}
await page.mouse.move(1720 / 1.2, 40);
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/cursor-hot.png`, clip: { x: 1200, y: 0, width: 240, height: 120 } });
await browser.close();
