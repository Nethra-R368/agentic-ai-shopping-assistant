import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Check, ExternalLink, GitCompareArrows, Heart, MessageSquareText, Minus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { api } from '../lib/api';
import { discountPct, inr, providerLabel } from '../lib/format';
import { Stars } from './ProductCard';
import ProductImage from './ProductImage';

function AlertForm({ product }) {
  const { user } = useAuth();
  const { toast, closeProduct } = useShop();
  const [target, setTarget] = useState(Math.round((product.price || 0) * 0.9) || '');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <p className="text-sm text-muted">
        <Link to="/login" onClick={closeProduct} className="font-semibold text-brand hover:underline">Sign in</Link> to get price-drop alerts.
      </p>
    );
  }
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createAlert(product, Number(target));
      toast('Price alert created', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label htmlFor="alert-target" className="text-sm text-muted">Alert me below</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
        <input id="alert-target" type="number" min="1" required value={target} onChange={(e) => setTarget(e.target.value)} className="input w-32 pl-7" />
      </div>
      <button className="btn-ghost" disabled={busy}><BellRing className="h-4 w-4" /> Set alert</button>
    </form>
  );
}

export default function ProductModal() {
  const { activeProduct: p, closeProduct, inWishlist, toggleWishlist, inCompare, toggleCompare } = useShop();
  const navigate = useNavigate();

  useEffect(() => {
    if (!p) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeProduct();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [p, closeProduct]);

  const askAI = () => {
    closeProduct();
    navigate('/assistant', { state: { q: `Tell me more about the ${p.name}. Is it worth it, and what are the best alternatives?`, fresh: true } });
  };

  return (
    <AnimatePresence>
      {p && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={closeProduct}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-label={p.name}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto lg:max-w-4xl rounded-b-none sm:rounded-lg scrollbar-thin"
          >
            <button onClick={closeProduct} className="btn-icon absolute right-3 top-3 z-10 bg-surface" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
              <ProductImage product={p} className="aspect-[16/10] w-full lg:aspect-auto lg:min-h-full lg:rounded-l-2xl" />
              <div className="flex flex-col gap-4 p-6">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {p.insight?.badge && <span className="rounded-sm border border-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink">{p.insight.badge}</span>}
                    {p.seller && p.seller !== providerLabel[p.provider] && <><span>{p.seller}</span><span>·</span></>}
                    <span>{providerLabel[p.provider] || p.provider}</span>
                  </div>
                  <h2 className="text-3xl leading-tight">{p.name}</h2>
                  <div className="mt-2"><Stars rating={p.rating} count={p.reviews_count} /></div>
                </div>

                <div className="flex items-end gap-3">
                  <span className="font-mono text-3xl font-medium">{inr(p.price)}</span>
                  {discountPct(p) > 0 && (
                    <span className="mb-1 text-sm text-muted"><s>{inr(p.original_price)}</s> <span className="font-semibold text-success">{discountPct(p)}% off</span></span>
                  )}
                </div>
                {p.provider === 'ai' && <p className="-mt-2 text-xs text-muted">Estimated street price — check live prices before buying.</p>}

                {p.insight?.why && <p className="text-sm leading-relaxed">{p.insight.why}</p>}
                {(p.insight?.pros?.length > 0 || p.insight?.cons?.length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ul className="space-y-1.5">
                      {p.insight.pros.map((x) => (
                        <li key={x} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{x}</li>
                      ))}
                    </ul>
                    <ul className="space-y-1.5">
                      {p.insight.cons.map((x) => (
                        <li key={x} className="flex gap-2 text-sm text-muted"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-danger" />{x}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.description && p.description !== p.insight?.why && (
                  <p className="text-sm leading-relaxed text-muted">{p.description}</p>
                )}

                {Object.keys(p.specifications || {}).length > 0 && (
                  <dl className="divide-y divide-line rounded-md border border-line text-sm">
                    {Object.entries(p.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 px-3 py-2">
                        <dt className="text-muted">{k}</dt><dd className="text-right font-medium">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="flex flex-wrap gap-2">
                  {p.product_url && (
                    <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                      {p.provider === 'serpapi' ? `Buy on ${p.seller}` : 'Compare live prices'} <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => toggleWishlist(p)} className="btn-ghost">
                    <Heart className={`h-4 w-4 ${inWishlist(p.id) ? 'fill-danger text-danger' : ''}`} /> {inWishlist(p.id) ? 'Saved' : 'Save'}
                  </button>
                  <button onClick={() => toggleCompare(p)} className="btn-ghost">
                    <GitCompareArrows className="h-4 w-4" /> {inCompare(p.id) ? 'In compare' : 'Compare'}
                  </button>
                  <button onClick={askAI} className="btn-ghost"><MessageSquareText className="h-4 w-4" /> Ask AuraBuy</button>
                </div>
                <div className="border-t border-line pt-4"><AlertForm product={p} /></div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
