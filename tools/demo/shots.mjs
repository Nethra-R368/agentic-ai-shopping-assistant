// Capture marketing screenshots of AuraBuy with the locally installed Edge.
// Usage: node shots.mjs [baseUrl] [outDir]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = process.argv[3] || '../../submission/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });

async function shoot(name, { path = '/', theme = 'light', width = 1440, height = 900, mobile = false, full = false, act } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, colorScheme: theme, isMobile: mobile, hasTouch: mobile,
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('aurabuy.theme', t); } catch {} }, theme);
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(800);
  if (act) await act(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  console.log('saved', name);
  await ctx.close();
}

const ask = (q, wait = 'text=/product/i') => async (page) => {
  await page.getByRole('textbox', { name: 'What are you shopping for?' }).fill(q);
  await page.keyboard.press('Enter');
  await page.waitForSelector('article', { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector('.typing-dot'), null, { timeout: 120000 });
  await page.waitForTimeout(1500);
};

const only = process.argv[4];
const jobs = {
  'home-light': () => shoot('01-home-light'),
  'home-full': () => shoot('02-home-full', { full: true }),
  'home-dark': () => shoot('03-home-dark', { theme: 'dark' }),
  'mobile': () => shoot('04-home-mobile', { width: 390, height: 844, mobile: true }),
  'search': () => shoot('05-assistant-search', { path: '/assistant', act: ask('Best laptop for coding under ₹70,000') }),
};
for (const [k, fn] of Object.entries(jobs)) if (!only || only.split(',').includes(k)) await fn();
await browser.close();
