// Avatares para los mails de grip: papel + tinta líquida (filtro goo, como el logo).
// Genera: grip (wordmark), vr, y a–z en negro y en rojo. 512×512 PNG.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('public/avatars');
mkdirSync(OUT, { recursive: true });
const font = readFileSync(resolve('node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2')).toString('base64');
const { GLYPHS, GLYPH_ORDER, VIEWBOX, blobPath } = await import('../src/ui/logo-paths.js');
const wordmark = GLYPH_ORDER.map((k) => `<path d="${blobPath(GLYPHS[k])}"/>`).join('');

const page = (inner, bg = '#f4f1ea') => `<!doctype html><html><head><style>
@font-face{font-family:'Archivo';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
html,body{margin:0;width:512px;height:512px;background:${bg};overflow:hidden}
svg{display:block;width:512px;height:512px}
text{font-family:'Archivo';font-weight:900;font-stretch:88%;letter-spacing:-0.06em}
</style></head><body>${inner}</body></html>`;

const goo = `<filter id="goo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"/></filter>`;

const avatarText = (txt, ink) => {
  const size = txt.length === 1 ? 360 : txt.length === 2 ? 250 : 190;
  return page(`<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${goo}</defs>
  <g filter="url(#goo)" fill="${ink}"><text x="256" y="${256 + size * 0.35}" font-size="${size}" text-anchor="middle">${txt}</text></g>
  <circle cx="448" cy="64" r="9" fill="${ink === '#111111' ? '#f0403c' : '#111111'}"/></svg>`);
};
const avatarGrip = (ink, bg) => page(`<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(56 120) scale(${400 / VIEWBOX.w})" fill="${ink}">${wordmark}</g></svg>`, bg);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const pg = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
const shoot = async (name, html) => {
  await pg.setContent(html, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(120);
  writeFileSync(resolve(OUT, name + '.png'), await pg.screenshot({ type: 'png' }));
  console.log(name);
};
await shoot('grip', avatarGrip('#111111', '#f4f1ea'));
await shoot('grip-rojo', avatarGrip('#f0403c', '#f4f1ea'));
await shoot('grip-invertido', avatarGrip('#f4f1ea', '#111111'));
await shoot('vr', avatarText('vr', '#111111'));
await shoot('vr-rojo', avatarText('vr', '#f0403c'));
for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
  await shoot(`letra-${ch}`, avatarText(ch, '#111111'));
  await shoot(`letra-${ch}-rojo`, avatarText(ch, '#f0403c'));
}
await browser.close();
