import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

export default function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-soft to-surface-2 ${className}`}>
        <ShoppingBag className="h-8 w-8 text-brand/70" />
        <span className="px-4 text-center text-xs font-medium text-muted line-clamp-2">{product.brand || product.category || product.name}</span>
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
        className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
      />
    </div>
  );
}
