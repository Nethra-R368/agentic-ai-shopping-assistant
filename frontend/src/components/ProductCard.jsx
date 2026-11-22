import { motion } from 'framer-motion';
import { ExternalLink, GitCompareArrows, Heart, Star } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { discountPct, inr } from '../lib/format';
import ProductImage from './ProductImage';

const BADGE_STYLES = {
  'Best overall': 'bg-primary text-on-primary',
  'Best value': 'bg-surface text-ink border border-ink',
  'Top rated': 'bg-surface text-ink border border-line',
  'Budget pick': 'bg-surface text-ink border border-line',
  'Lowest price': 'bg-surface text-ink border border-line',
  'Premium pick': 'bg-surface text-ink border border-line',
};

export function Stars({ rating, count }) {
  if (!rating) return <span className="text-xs text-muted">No ratings</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Star className="h-3 w-3 fill-ink text-ink" />
      <span className="font-semibold text-ink">{rating}</span>
      {count ? <span>({count.toLocaleString('en-IN')})</span> : null}
    </span>
  );
}

export default function ProductCard({ product, index = 0 }) {
  const { inWishlist, inCompare, toggleWishlist, toggleCompare, openProduct } = useShop();
  const saved = inWishlist(product.id);
  const comparing = inCompare(product.id);
  const off = discountPct(product);
  const badge = product.insight?.badge;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      className="group card flex flex-col overflow-hidden transition hover:border-ink/40"
    >
      <div className="relative">
        <button onClick={() => openProduct(product)} className="block w-full cursor-pointer" aria-label={`View details for ${product.name}`}>
          <ProductImage product={product} className="aspect-[4/3] w-full" />
        </button>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {badge && <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${BADGE_STYLES[badge] || BADGE_STYLES['Top rated']}`}>{badge}</span>}
          {off > 0 && <span className="rounded-sm bg-brand px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">−{off}%</span>}
        </div>
        <button
          onClick={() => toggleWishlist(product)}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 transition cursor-pointer ${saved ? 'text-brand' : 'text-muted hover:text-ink'}`}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
        >
          <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="truncate">{product.seller || product.brand || product.category}</span>
          <Stars rating={product.rating} count={product.reviews_count} />
        </div>
        <button onClick={() => openProduct(product)} className="text-left cursor-pointer">
          <h3 className="text-[15px] font-medium leading-snug line-clamp-2 hover:underline underline-offset-2">{product.name}</h3>
        </button>
        {product.insight?.why && <p className="text-sm text-muted line-clamp-2">{product.insight.why}</p>}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className="font-mono text-[17px] font-medium">{inr(product.price)}</div>
            {off > 0 && <div className="text-xs text-muted line-through">{inr(product.original_price)}</div>}
            {product.provider === 'ai' && <div className="font-mono text-[10px] uppercase tracking-wider text-muted">est. price</div>}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => toggleCompare(product)}
              className={`btn-icon h-9 w-9 border ${comparing ? 'border-ink bg-primary text-on-primary hover:bg-primary hover:text-on-primary' : 'border-line'}`}
              aria-label={comparing ? 'Remove from compare' : 'Add to compare'}
              aria-pressed={comparing}
              title={comparing ? 'Remove from compare' : 'Compare'}
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
            {product.product_url && (
              <a href={product.product_url} target="_blank" rel="noopener noreferrer" className="btn-primary h-9 whitespace-nowrap px-3 text-xs"
                title={product.provider === 'serpapi' ? `Open on ${product.seller}` : 'See live prices across stores'}>
                {product.provider === 'serpapi' ? 'View deal' : 'Prices'} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-4">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-4 h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
