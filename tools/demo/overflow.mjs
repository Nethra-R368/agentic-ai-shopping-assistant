// Report elements wider than a phone viewport. Usage: node overflow.mjs [url]
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://localhost:5173/';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'networkidle' });
const res = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.width > 0) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
  }
  return { vw, scrollW: document.documentElement.scrollWidth, out: out.slice(0, 12) };
});
console.log(JSON.stringify(res, null, 1));
await b.close();
