// captura puntual: beat oclucrm (ES y EN) para verificar la negrita del crédito
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const SHOTS = 'shots-hold';
mkdirSync(SHOTS, { recursive: true });
const URL = process.env.URL || 'http://localhost:4173/?nosplash';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const H = await page.evaluate(() => document.getElementById('journey').offsetHeight - window.innerHeight);
let y = 0;
const target = Math.round(H * 0.49);
while (y < target) {
  y = Math.min(target, y + 500);
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(40);
}
await page.waitForTimeout(1600);
await page.screenshot({ path: `${SHOTS}/oclu-es.png` });
await page.click('#lang2');
await page.waitForTimeout(700);
await page.screenshot({ path: `${SHOTS}/oclu-en.png` });
await browser.close();
console.log('ok');
