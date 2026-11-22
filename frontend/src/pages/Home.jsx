import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { api } from '../lib/api';

const EXAMPLES = [
  'A laptop for coding under ₹70,000',
  'iPhone 15 or Galaxy S24 — which should I buy?',
  'Running shoes for flat feet',
  'A gift for my dad who loves cooking, under ₹3,000',
];

const CATEGORIES = [
  { name: 'Laptops', hint: 'for coding & college', q: 'Best laptop for coding and college under ₹70,000' },
  { name: 'Phones', hint: 'best camera under 30k', q: 'Best camera phone under ₹30,000' },
  { name: 'Headphones', hint: 'noise cancelling', q: 'Best noise cancelling headphones under ₹15,000' },
  { name: 'Running shoes', hint: 'daily trainers', q: 'Best running shoes for daily training under ₹8,000' },
  { name: 'Kitchen', hint: 'air fryers, mixers', q: 'Best air fryer for a family of four' },
  { name: 'Skincare', hint: 'sunscreen for oily skin', q: 'Best sunscreen for oily skin in India' },
  { name: 'Home office', hint: 'chairs & desks', q: 'Ergonomic office chair under ₹12,000' },
  { name: 'Gifts', hint: 'under ₹2,000', q: 'Thoughtful gift ideas under ₹2,000' },
];

const SEARCH_STEP = {
  live: ['Searches', 'It pulls current listings from Google Shopping across Indian stores — Amazon, Flipkart, Croma, brand stores and more.'],
  ai: ['Shortlists', 'It shortlists real, currently sold models that fit your need and budget, then links each one to live store prices.'],
};
const STEPS = [
  ['Reads', 'It looks at price, discount, rating, review count and specs for each option, not just the title.'],
  ['Decides', 'It ranks the options, names one pick and says why, with honest pros and cons. Estimated prices are always labelled.'],
];

export default function Home() {
  const navigate = useNavigate();
  const [live, setLive] = useState(false);
  useEffect(() => { api.health().then((h) => setLive(!!h.live_search)).catch(() => {}); }, []);
  const steps = [live ? SEARCH_STEP.live : SEARCH_STEP.ai, ...STEPS];
  const go = ({ message, image }) => navigate('/assistant', { state: { q: message, image, fresh: true } });

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="eyebrow">Shopping research, done for you</p>
            <h1 className="mt-5 text-[44px] leading-[1.02] sm:text-[68px]">
              Tell it what you need.<br />
              <em className="text-muted">It tells you what to buy.</em>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
              Describe it, say it out loud, or upload a photo. AuraBuy compares prices, ratings and specs across Indian
              stores and gives you one clear recommendation — with the reasoning.
            </p>
            <div className="mt-8 max-w-xl">
              <SearchBar onSubmit={go} placeholder="e.g. a quiet mechanical keyboard under ₹6,000" autoFocus />
            </div>
            <div className="mt-5 flex max-w-xl flex-col gap-1.5 text-sm">
              <span className="eyebrow">Try</span>
              {EXAMPLES.map((s) => (
                <button key={s} onClick={() => go({ message: s })} className="group flex self-start items-center gap-1.5 text-left text-ink/80 hover:text-ink cursor-pointer">
                  <span className="underline decoration-line underline-offset-4 group-hover:decoration-ink">{s}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted group-hover:text-brand" />
                </button>
              ))}
            </div>
          </div>

          <aside className="self-end lg:pb-2">
            <ol className="divide-y divide-line border-y border-line">
              {[
                ['A straight answer', 'One pick, the reason, and the trade-off to know about — not a wall of links.'],
                ['Ranked options', 'Up to six products with price, rating and pros & cons pulled from the data.'],
                ['Follow-ups that remember', '“Anything cheaper?” or “which has the better battery?” works mid-conversation.'],
                ['Compare, save, track', 'Line up finalists side by side, keep a wishlist, and set a price-drop alert.'],
              ].map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-2 py-4">
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                  <div>
                    <div className="font-medium">{t}</div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-4xl">Start with a category</h2>
          <span className="hidden text-sm text-muted sm:inline">Each one runs a real search</span>
        </div>
        <div className="mt-6 grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              onClick={() => go({ message: c.q })}
              className="group flex min-h-32 flex-col justify-between border-b border-r border-line p-5 text-left transition hover:bg-surface cursor-pointer"
            >
              <span className="font-display text-[28px] leading-none">{c.name}</span>
              <span className="flex items-center justify-between text-sm text-muted">
                {c.hint}
                <ArrowUpRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 className="text-4xl">How it decides</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          {steps.map(([t, d], i) => (
            <div key={t} className="border-t border-ink pt-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-lg">{t}</h3>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
