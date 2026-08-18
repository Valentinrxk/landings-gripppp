// capturas de la escena plantilla→marca a distintos progresos (desktop y mobile)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const SHOTS = process.env.SHOTS_DIR || 'shots';
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.URL || 'http://localhost:5174/?nosplash';
const FR = (process.env.FR || '0,0.12,0.3,0.5,0.7,0.9').split(',').map(Number);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
async function run(tag, vp, mobile) {
  const page = await browser.newPage({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag} console: ${m.text()}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const inf = await page.evaluate(() => {
    const s = document.querySelector('#plantilla');
    return { top: s.getBoundingClientRect().top + window.scrollY, h: s.offsetHeight - window.innerHeight };
  });
  // llegar de a pasos (para que disparen los onEnter)
  const pre = inf.top - vp.height * 0.7;
  await page.evaluate((v) => window.scrollTo(0, v), pre);
  await page.waitForTimeout(400);
  for (const f of FR) {
    await page.evaluate((v) => window.scrollTo(0, v), inf.top + inf.h * f);
    await page.waitForTimeout(f === FR[0] ? 2600 : 1400);
    await page.screenshot({ path: `${SHOTS}/${tag}-pl-${Math.round(f * 100)}.png` });
  }
  const st = await page.evaluate(() => {
    const c = document.querySelector('.ad-cmp');
    return { value: c?.value, val: document.querySelector('.cell-val')?.textContent, overflowX: document.documentElement.scrollWidth - innerWidth };
  });
  console.log(tag, JSON.stringify(st));
  await page.close();
}
await run('desk', { width: 1440, height: 900 }, false);
await run('mob', { width: 390, height: 844 }, true);
console.log('ERRORES:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
