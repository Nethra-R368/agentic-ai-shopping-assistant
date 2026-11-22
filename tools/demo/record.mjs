// Record a narrated-pace product demo of AuraBuy (no audio — add voice-over afterwards).
// Usage: node record.mjs [baseUrl] [outDir]
// Output: <outDir>/aurabuy-demo.webm plus a timestamped scene list (scenes.txt) for syncing voice-over.
import { chromium } from 'playwright-core';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';

const BASE = process.argv[2] || 'https://agentic-ai-shopping-assistant.vercel.app';
const OUT = process.argv[3] || '../../submission/video';
const W = 1440, H = 900;
mkdirSync(OUT, { recursive: true });

// Wake the free-tier backend first so the recording never shows the cold-start banner.
const api = process.env.API_URL || 'https://ecommerce-ai-backend-ks4r.onrender.com';
for (let i = 0; i < 12; i++) { try { const r = await fetch(`${api}/health`); if (r.ok) break; } catch {} await new Promise((r) => setTimeout(r, 5000)); }

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, colorScheme: 'light',
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
await ctx.addInitScript(() => {
  try { localStorage.setItem('aurabuy.theme', 'light'); } catch {}
  // Visible cursor so viewers can follow along.
  window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;' +
      'background:rgba(27,26,23,.18);border:2px solid rgba(27,26,23,.75);pointer-events:none;transition:transform .12s;left:-50px;top:-50px';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  });
});
const page = await ctx.newPage();
const t0 = Date.now();
const scenes = [];
const scene = (name) => { const s = ((Date.now() - t0) / 1000).toFixed(1); scenes.push(`${s}s  ${name}`); console.log(s, name); };
const pause = (ms) => page.waitForTimeout(ms);

async function moveTo(locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 25 });
  await pause(250);
}
async function click(locator) { await moveTo(locator); await locator.click(); }
async function typeSlow(locator, text) { await click(locator); await page.keyboard.type(text, { delay: 55 }); await pause(500); }
async function waitForAnswer() {
  await page.waitForSelector('.typing-dot', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.typing-dot') && !document.body.innerText.includes('Writing recommendation…'), null, { timeout: 120000 });
  await pause(1200);
}
async function smoothScroll(dy, steps = 30) { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await pause(25); } }
const box = () => page.getByRole('textbox', { name: 'What are you shopping for?' });

// 1. Landing page
scene('Home page — the pitch');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.mouse.move(W / 2, H / 2);
await pause(3500);
await smoothScroll(700); await pause(2500);
await smoothScroll(700); await pause(2500);
await smoothScroll(-1400, 40); await pause(1000);

// 2. Natural-language search with a budget
scene('Natural-language search with a budget');
await typeSlow(box(), 'Best laptop for coding under ₹70,000');
await page.keyboard.press('Enter');
await waitForAnswer();
scene('Answer: one clear pick + ranked options');
await pause(2500);
await smoothScroll(500); await pause(2500);
await smoothScroll(500); await pause(2000);

// 3. Product details
scene('Product details: why it fits, pros & cons, specs');
await click(page.locator('article h3').first());
await pause(4500);
await page.keyboard.press('Escape'); await pause(800);

// 4. Agentic follow-up comparison
scene('Follow-up: compare two specific phones');
await typeSlow(box(), 'iPhone 15 or Galaxy S24 — which should I buy?');
await page.keyboard.press('Enter');
await waitForAnswer();
scene('Agent answer: comparison table + verdict');
await pause(2000);
await smoothScroll(-400); await pause(2500);
await smoothScroll(500); await pause(2500);

// 5. Add to compare + compare page
scene('Add finalists to Compare');
const cmp = page.getByRole('button', { name: 'Add to compare' });
await click(cmp.nth(0)); await pause(700);
await click(cmp.nth(1)); await pause(900);
await click(page.getByRole('link', { name: /^Compare/ }).first());
await page.waitForSelector('text=Verdict', { timeout: 60000 });
await page.waitForFunction(() => !document.querySelector('.skeleton'), null, { timeout: 120000 });
scene('Compare page: verdict + spec table with winners');
await pause(3500);
await smoothScroll(600); await pause(3000);
await smoothScroll(-600); await pause(800);

// 6. Wishlist
scene('Save to wishlist');
await click(page.getByRole('link', { name: 'Assistant' }).first());
await pause(1200);
const heart = page.getByRole('button', { name: 'Save to wishlist' }).first();
if (await heart.count()) { await click(heart); await pause(1200); }
await click(page.getByRole('link', { name: /^Wishlist/ }).first());
await pause(3000);

// 7. Dark mode + mobile-friendly close
scene('Dark mode');
await click(page.getByRole('button', { name: /Switch to dark theme/ }));
await pause(2500);
await click(page.getByRole('link', { name: 'AuraBuy home' }));
await pause(3500);
scene('End');

const video = page.video();
await ctx.close();
await browser.close();
const raw = await video.path();
renameSync(raw, `${OUT}/aurabuy-demo.webm`);
writeFileSync(`${OUT}/scenes.txt`, scenes.join('\n') + '\n');
console.log('saved', `${OUT}/aurabuy-demo.webm`);
