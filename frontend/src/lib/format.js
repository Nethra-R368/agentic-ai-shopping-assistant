export const inr = (n) =>
  n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—';

export const discountPct = (p) =>
  p.original_price && p.original_price > p.price ? Math.round((1 - p.price / p.original_price) * 100) : 0;

export function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const providerLabel = {
  serpapi: 'Live prices',
  ai: 'AI-estimated prices',
  demo: 'Demo catalog',
};

export function readStore(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
