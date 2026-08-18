// Verificación visual: desktop 1440×900 y mobile 390×844, scroll paso a paso,
// capturas por escena y chequeo de errores/overflow.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const SHOTS = process.env.SHOTS_DIR || 'shots';
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.URL || 'http://localhost:5174/?nosplash';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];

async function run(tag, vp, mobile) {
  const page = await browser.newPage({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag} console: ${m.text()}`));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${SHOTS}/${tag}-hero-print.png` });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SHOTS}/${tag}-hero.png` });
  const marks = await page.evaluate(() =>
    ['#proceso', '#trabajos', '#specs', '#contacto'].map((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return { s, y: r.top + window.scrollY };
    })
  );
  let y = 0;
  const step = mobile ? 260 : 420;
  for (const m of marks) {
    const target = m.y - (mobile ? 40 : 60);
    while (y < target) {
      y = Math.min(target, y + step);
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${SHOTS}/${tag}-${m.s.replace(/[#.:()-]/g, '')}.png` });
    // media escena más abajo (los pliegos se imprimen con el scroll)
    y += mobile ? 380 : 520;
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${SHOTS}/${tag}-${m.s.replace(/[#.:()-]/g, '')}-b.png` });
  }
  // la cinta: capturas a distintos progresos de la sección (quieto → registra)
  const secInfo = await page.evaluate(() => {
    const s = document.querySelector('#trabajos');
    return { top: s.getBoundingClientRect().top + window.scrollY, h: s.offsetHeight - window.innerHeight };
  });
  for (const f of [0.15, 0.3, 0.45, 0.62, 0.8]) {
    await page.evaluate((v) => window.scrollTo(0, v), secInfo.top + secInfo.h * f);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${SHOTS}/${tag}-cinta-${Math.round(f * 100)}.png` });
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${tag}-end.png` });
  const info = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    stamps: [...document.querySelectorAll('.pl-stamp')].map((s) => getComputedStyle(s).visibility).join(','),
    trackX: document.querySelector('.pl-track').style.transform,
  }));
  console.log(tag, JSON.stringify(info));
  await page.close();
}

await run('desk', { width: 1440, height: 900 }, false);
await run('mob', { width: 390, height: 844 }, true);
console.log('ERRORES:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
