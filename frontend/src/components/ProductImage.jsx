import { useState } from 'react';

/**
 * Product photo, or (when the source has no image) a typographic "label" in the
 * style of a shop tag: brand in serif, category in mono.
 */
export default function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) {
    const brand = product.brand || product.name.split(' ').slice(0, 2).join(' ');
    return (
      <div className={`relative flex flex-col items-center justify-center gap-1.5 bg-surface-2 px-6 text-center ${className}`}>
        <span className="font-display text-3xl leading-tight text-ink/80 line-clamp-2">{brand}</span>
        {product.category && <span className="eyebrow">{product.category}</span>}
        <span className="absolute bottom-2.5 right-3 font-mono text-[10px] text-muted">no photo</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center bg-white ${className}`}>
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-4 mix-blend-multiply transition duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}
