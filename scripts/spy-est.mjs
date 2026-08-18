import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto((process.env.URL || 'http://localhost:5174/') + '?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
for (const frac of [0.9, 0.7, 0.5, 0.4, 0.2]) {
  await page.evaluate((fr) => {
    const e = document.querySelectorAll('.est')[1];
    window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - window.innerHeight * fr);
  }, frac);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const e = document.querySelectorAll('.est')[1];
    const st = window.__landings.ScrollTrigger.getAll().find((t) => t.trigger === e);
    return {
      p: st && +st.progress.toFixed(2), start: st && Math.round(st.start), end: st && Math.round(st.end), scrollY: Math.round(window.scrollY),
      top: Math.round((e.getBoundingClientRect().top / window.innerHeight) * 100),
      est: getComputedStyle(e).visibility,
      sello: getComputedStyle(e.querySelector('.sello')).visibility,
      tf: e.style.transform,
    };
  });
  console.log(frac, JSON.stringify(r));
}
await browser.close();
