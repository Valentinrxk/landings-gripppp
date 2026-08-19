import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(process.env.URL || 'http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
const cdp = await ctx.newCDPSession(page);
const st = async (tag) => console.log(tag, await page.evaluate(() => JSON.stringify({ y: Math.round(scrollY), cls: document.documentElement.className, ov: getComputedStyle(document.documentElement).overflow, bodyOv: getComputedStyle(document.body).overflow, h: document.documentElement.scrollHeight })));
await st('antes');
for (let i = 0; i < 4; i++) {
  await cdp.send('Input.synthesizeScrollGesture', { x: 200, y: 600, yDistance: -500, speed: 1200 });
  await page.waitForTimeout(600);
  await st('swipe' + i);
}
await browser.close();
