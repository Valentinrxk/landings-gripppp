// Ingeniería inversa de vanlent.dev: capturas por scroll + estructura + scripts.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const SHOTS = process.env.SHOTS_DIR || 'shots';
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const scripts = [];
page.on('response', async (r) => {
  const u = r.url();
  if (/\.js(\?|$)/.test(u) || /\.css(\?|$)/.test(u)) scripts.push({ u, s: r.status(), len: +(r.headers()['content-length'] || 0) });
});
await page.goto('https://vanlent.dev/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SHOTS}/v-0.png` });
const info = await page.evaluate(() => {
  const H = document.documentElement.scrollHeight;
  const secs = [...document.querySelectorAll('section, main > *, body > *')].slice(0, 40).map((e) => ({
    tag: e.tagName, cls: e.className?.toString().slice(0, 80), id: e.id, top: Math.round(e.getBoundingClientRect().top + scrollY), h: e.offsetHeight,
    pos: getComputedStyle(e).position,
  }));
  const fonts = [...new Set([...document.querySelectorAll('h1,h2,h3,p,a,span')].map((e) => getComputedStyle(e).fontFamily))].slice(0, 8);
  const sticky = [...document.querySelectorAll('*')].filter((e) => ['sticky', 'fixed'].includes(getComputedStyle(e).position)).slice(0, 30).map((e) => e.tagName + '.' + e.className?.toString().slice(0, 60));
  const canvases = document.querySelectorAll('canvas').length;
  const html = document.body.innerHTML.length;
  return { H, secs, fonts, sticky, canvases, html, title: document.title, bg: getComputedStyle(document.body).backgroundColor };
});
console.log(JSON.stringify(info, null, 1));
console.log('scripts:', scripts.map((s) => `${s.u} ${s.len}`).join('\n'));
writeFileSync(`${SHOTS}/v-body.html`, await page.evaluate(() => document.documentElement.outerHTML));
const H = info.H;
const steps = 14;
for (let i = 1; i <= steps; i++) {
  const y = Math.round(((H - 900) * i) / steps);
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/v-${i}.png` });
}
// mid-scroll (en movimiento) para ver qué hace con velocidad
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.mouse.move(700, 450);
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 260);
  await page.waitForTimeout(40);
}
await page.screenshot({ path: `${SHOTS}/v-moving.png` });
await browser.close();
