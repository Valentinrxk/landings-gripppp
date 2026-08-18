import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5174/?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => window.scrollTo(0, 3000));
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(300);
  console.log(await page.evaluate(() => JSON.stringify({ y: window.scrollY, lean: +window.__landings.lean().toFixed(3), vel: +window.__landings.vel().toFixed(3) })));
}
await browser.close();
