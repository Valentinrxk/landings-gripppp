// Coreografía de entrada de plantilla→marca cuadro por cuadro (reloj falso de
// playwright: cada captura es un instante exacto de la timeline). URL por env.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.clock.install();
await page.goto(process.env.URL || 'http://localhost:5174/?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const inf = await page.evaluate(() => { const s = document.querySelector('#plantilla'); return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight - innerHeight }; });
await page.evaluate((v) => scrollTo(0, v), inf.top - 700);
await page.waitForTimeout(400);
const now = await page.evaluate(() => Date.now());
await page.clock.pauseAt(now + 2000);
await page.evaluate((v) => scrollTo(0, v), inf.top);
await page.clock.runFor(40);
let t = 40;
const shots = [];
for (const ms of [120, 300, 480, 560, 700, 900, 1100, 1300, 1420, 1500, 1580, 1660, 1900]) {
  await page.clock.runFor(ms - t); t = ms;
  await page.screenshot({ path: `shots/enter-${ms}.png`, clip: { x: 130, y: 270, width: 1180, height: 560 } });
  shots.push(ms);
}
console.log(JSON.stringify(shots));
await browser.close();
