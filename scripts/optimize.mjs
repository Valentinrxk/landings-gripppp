// PNG 2732px → JPG 1600px (las capturas pesan >1MB; el pliego se muestrea a
// celdas de 7–24px, no necesita más). Usa el Edge del sistema vía playwright.
import { chromium } from 'playwright-core';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../public/works/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.png'))) {
  const b64 = readFileSync(join(dir, f)).toString('base64');
  const out = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    const W = 1600;
    const H = Math.round((img.naturalHeight / img.naturalWidth) * W);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d').drawImage(img, 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.82).split(',')[1];
  }, b64);
  const name = f.replace(/\.png$/, '.jpg');
  writeFileSync(join(dir, name), Buffer.from(out, 'base64'));
  console.log(name, Math.round(Buffer.from(out, 'base64').length / 1024) + 'kb');
}
await browser.close();
