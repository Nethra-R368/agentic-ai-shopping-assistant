import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BellRing, Camera, GitCompareArrows, Mic, Sparkles, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductCard, { ProductGridSkeleton } from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { api } from '../lib/api';

const SUGGESTIONS = [
  'Best laptop for coding under ₹70,000',
  'Noise cancelling headphones for travel',
  'Perfume for men under ₹5,000',
  'Minimalist home decor for a small flat',
  'Running shoes for flat feet',
  'Gift for a coffee lover under ₹2,000',
];

const FEATURES = [
  { icon: Wand2, title: 'Ask like a person', text: 'Describe what you need, your budget and how you’ll use it. AuraBuy works out the rest.' },
  { icon: Camera, title: 'Search with a photo', text: 'Snap or drop an image to find the same item, a cheaper dupe, or something that matches.' },
  { icon: Mic, title: 'Or just say it', text: 'Hands-free voice search, and replies can be read aloud.' },
  { icon: Sparkles, title: 'Explained picks', text: 'Every result comes ranked with why it fits, honest pros and cons, and a clear top pick.' },
  { icon: GitCompareArrows, title: 'Side-by-side compare', text: 'Line up to four products and get a verdict on which to buy and who each one suits.' },
  { icon: BellRing, title: 'Price-drop alerts', text: 'Save products, set a target price and track the price history in one place.' },
];

export default function Home() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState(null);

  useEffect(() => { api.trending().then(setTrending).catch(() => setTrending([])); }, []);

  const go = ({ message, image }) => navigate('/assistant', { state: { q: message, image, fresh: true } });

  return (
    <>
      <section className="aura-glow relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> AI shopping concierge for India
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] sm:text-6xl">
              Stop scrolling.<br /><span className="gradient-text">Start finding.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
              Tell AuraBuy what you need by text, voice or photo. It searches stores, ranks the options and explains which one to buy and why.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto mt-10 max-w-2xl text-left">
            <SearchBar onSubmit={go} placeholder="e.g. a quiet mechanical keyboard under ₹6,000" autoFocus />
          </motion.div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => go({ message: s })} className="chip">{s}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></div>
              <h3 className="font-sans text-base font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Top rated right now</h2>
            <p className="mt-1 text-sm text-muted">Popular picks to get you started. Tap any product for details.</p>
          </div>
        </div>
        {trending === null ? (
          <ProductGridSkeleton count={8} />
        ) : trending.length === 0 ? (
          <p className="card p-8 text-center text-muted">Trending products are unavailable right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trending.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="card aura-glow grid gap-8 p-8 sm:p-12 md:grid-cols-3">
          {[
            ['1', 'Describe', 'Type, talk or upload a photo. Add a budget or use case if you have one.'],
            ['2', 'AuraBuy researches', 'An AI agent searches stores, reads specs, ratings and prices, then ranks options.'],
            ['3', 'Decide with confidence', 'Get a top pick with reasons, compare finalists, save them, and buy at the best price.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="font-display text-4xl font-bold gradient-text">{n}</div>
              <h3 className="mt-2 font-sans text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
