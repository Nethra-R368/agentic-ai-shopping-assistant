import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { inr } from '../lib/format';

export default function Wishlist() {
  const { wishlist } = useShop();
  const { user } = useAuth();
  const total = wishlist.reduce((s, p) => s + (p.price || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Wishlist</h1>
          <p className="mt-1 text-muted">
            {wishlist.length ? `${wishlist.length} saved · ${inr(total)} total` : 'Products you save will show up here.'}
          </p>
        </div>
        {!user && wishlist.length > 0 && (
          <p className="text-sm text-muted"><Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link> to sync your wishlist across devices.</p>
        )}
      </div>

      {wishlist.length === 0 ? (
        <div className="mx-auto max-w-md py-20 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="mt-5 text-muted">Tap the heart on any product to save it for later.</p>
          <Link to="/assistant" className="btn-primary mt-6">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlist.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      )}
    </div>
  );
}
