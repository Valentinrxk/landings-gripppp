// captura del cursor: agarre al presionar + sello al soltar
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
mkdirSync('shots-hold', { recursive: true });
const URL = process.env.URL || 'http://localhost:4173/?nosplash';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.mouse.move(700, 450);
await page.waitForTimeout(600);
const clip = { x: 560, y: 310, width: 280, height: 280 };
await page.screenshot({ path: 'shots-hold/cur-idle.png', clip });
await page.mouse.down();
await page.waitForTimeout(260);
await page.screenshot({ path: 'shots-hold/cur-down.png', clip });
await page.mouse.up();
await page.waitForTimeout(120);
await page.screenshot({ path: 'shots-hold/cur-stamp.png', clip });
// segundo click en otro punto para ver el sello temprano
await page.mouse.move(700, 450);
await page.mouse.down();
await page.waitForTimeout(40);
await page.screenshot({ path: 'shots-hold/cur-stamp2.png', clip });
await page.mouse.up();
await browser.close();
console.log('ok');
