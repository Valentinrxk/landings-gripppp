import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await page.goto('http://localhost:5174/?nosplash', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const dump = () => page.evaluate(() => {
  const ST = window.__landings.ScrollTrigger;
  const li = document.querySelectorAll('.est')[1];
  const st = ST.getAll().find((t) => t.trigger === li);
  return { docTop: Math.round(li.getBoundingClientRect().top + window.scrollY), start: Math.round(st.start), end: Math.round(st.end), vh: window.innerHeight, docH: document.documentElement.scrollHeight, heroH: document.querySelector('.s-hero').offsetHeight };
});
console.log('antes', JSON.stringify(await dump()));
await page.evaluate(() => window.__landings.ScrollTrigger.refresh());
await page.waitForTimeout(300);
console.log('post-refresh', JSON.stringify(await dump()));
await browser.close();
