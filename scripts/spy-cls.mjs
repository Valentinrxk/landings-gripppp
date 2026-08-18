import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5174/?slow=4', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(700);
  console.log(await page.evaluate(() => JSON.stringify({ cls: document.documentElement.className, brand: getComputedStyle(document.querySelector('.brand')).opacity, count: document.querySelector('.splash-count')?.textContent })));
}
await browser.close();
