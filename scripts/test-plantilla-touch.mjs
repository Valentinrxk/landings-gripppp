// Touch en el celu: arrastrar la hoja mueve la racleta; un swipe sobre el
// cuadro sigue siendo scroll nativo (nunca se secuestra). URL por env.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(process.env.URL || 'http://localhost:5174/?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const inf = await page.evaluate(() => { const s = document.querySelector('#plantilla'); return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight - innerHeight }; });
await page.evaluate((v) => scrollTo(0, v), inf.top - 500);
await page.waitForTimeout(300);
await page.evaluate((v) => scrollTo(0, v), inf.top + inf.h * 0.4);
await page.waitForTimeout(3000);
const cdp = await ctx.newCDPSession(page);
const geo = await page.evaluate(() => { const b = document.querySelector('.ad-blade').getBoundingClientRect(); const c = document.querySelector('.ad-cmp').getBoundingClientRect(); return { bx: b.left + b.width / 2, by: b.top + b.height / 2, cx: c.left + c.width / 2, cy: c.top + 40, value: document.querySelector('.ad-cmp').value, handle: document.querySelector('.ad-cmp').handle }; });
console.log('before', geo);
const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
// 1) arrastrar la hoja hacia abajo
await touch('touchStart', geo.bx, geo.by);
for (let i = 1; i <= 8; i++) { await touch('touchMove', geo.bx, geo.by + i * 18); await page.waitForTimeout(30); }
await touch('touchEnd', 0, 0);
await page.waitForTimeout(300);
const v1 = await page.evaluate(() => [document.querySelector('.ad-cmp').value, scrollY]);
console.log('after blade drag', v1);
await page.screenshot({ path: 'shots/mob-touchdrag.png' });
// 2) swipe sobre el cuadro (no en la hoja): debe scrollear, no arrastrar
const y0 = await page.evaluate(() => scrollY);
await touch('touchStart', geo.cx, geo.cy + 60);
for (let i = 1; i <= 8; i++) { await touch('touchMove', geo.cx, geo.cy + 60 - i * 20); await page.waitForTimeout(30); }
await touch('touchEnd', 0, 0);
await page.waitForTimeout(400);
const v2 = await page.evaluate(() => [document.querySelector('.ad-cmp').value, scrollY]);
console.log('after swipe elsewhere', v2, 'scrolled', v2[1] - y0);
console.log('ERRORES:', errors.length ? errors.join('\n') : 'ninguno');
await browser.close();
