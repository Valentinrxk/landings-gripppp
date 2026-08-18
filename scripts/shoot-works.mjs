// Capturas de trabajos nuevos al mismo formato que las demás (1600px de ancho, jpg)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const targets = [
  ['lightproject', 'https://lightproject.app/es'],
  ['parell', 'https://parell.app/'],
];
for (const [name, url] of targets) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 600 }, deviceScaleFactor: 1.2 });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.log(name, 'goto:', e.message.split('\n')[0]);
  }
  await page.waitForTimeout(3500);
  // cerrar banners de cookies obvios
  for (const sel of ['button:has-text("Aceptar")', 'button:has-text("Accept")', '[aria-label*="cerrar" i]', '[aria-label*="close" i]']) {
    try { const b = page.locator(sel).first(); if (await b.count()) await b.click({ timeout: 800 }); } catch {}
  }
  await page.waitForTimeout(800);
  const buf = await page.screenshot({ type: 'jpeg', quality: 84 });
  writeFileSync(`public/works/${name}.jpg`, buf);
  console.log(name, 'ok', buf.length);
  await page.close();
}
await browser.close();
