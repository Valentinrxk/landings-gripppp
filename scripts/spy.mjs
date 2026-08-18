// v3: capturas del viaje a distintos progresos (desktop + mobile), errores, overflow.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const SHOTS = process.env.SHOTS_DIR || 'shots';
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.URL || 'http://localhost:5174/';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function run(tag, vp, mobile) {
  const page = await browser.newPage({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag} console: ${m.text()}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${tag}-intro.png` });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/${tag}-hero.png` });
  const H = await page.evaluate(() => document.getElementById('journey').offsetHeight - window.innerHeight);
  const fr = [0.03, 0.075, 0.12, 0.16, 0.24, 0.28, 0.32, 0.405, 0.49, 0.573, 0.657, 0.74, 0.8, 0.86, 0.905, 0.99];
  let y = 0;
  for (const f of fr) {
    const target = Math.round(H * f);
    while (y < target) {
      y = Math.min(target, y + (mobile ? 300 : 500));
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/${tag}-${String(Math.round(f * 100)).padStart(3, '0')}.png` });
  }
  const info = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - window.innerWidth, gl: !!document.getElementById('field') }));
  console.log(tag, JSON.stringify(info));
  await page.close();
}
await run('desk', { width: 1440, height: 900 }, false);
await run('mob', { width: 390, height: 844 }, true);
console.log('ERRORES:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
