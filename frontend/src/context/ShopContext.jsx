import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { readStore, writeStore } from '../lib/format';
import { useAuth } from './AuthContext';

const ShopContext = createContext(null);
const WISH_KEY = 'aurabuy.wishlist';
const COMPARE_KEY = 'aurabuy.compare';
const MAX_COMPARE = 4;

export function ShopProvider({ children }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState(() => readStore(WISH_KEY, []));
  const [compare, setCompare] = useState(() => readStore(COMPARE_KEY, []));
  const [toasts, setToasts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const toastId = useRef(0);

  const toast = useCallback((message, tone = 'default') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  // Guests keep a local wishlist; on sign-out we fall back to it (adjusted during render).
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (!user) setWishlist(readStore(WISH_KEY, []));
  }

  // On sign-in the guest wishlist is merged into the account.
  useEffect(() => {
    if (!user) return;
    const local = readStore(WISH_KEY, []);
    const load = local.length ? api.syncWishlist(local) : api.wishlist();
    load
      .then((items) => {
        setWishlist(items.map((i) => i.product));
        if (local.length) writeStore(WISH_KEY, []);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => { writeStore(COMPARE_KEY, compare); }, [compare]);

  const inWishlist = useCallback((id) => wishlist.some((p) => p.id === id), [wishlist]);
  const inCompare = useCallback((id) => compare.some((p) => p.id === id), [compare]);

  const toggleWishlist = useCallback(async (product) => {
    const exists = wishlist.some((p) => p.id === product.id);
    const next = exists ? wishlist.filter((p) => p.id !== product.id) : [product, ...wishlist];
    setWishlist(next);
    if (!user) writeStore(WISH_KEY, next); // only guest wishlists live in the browser
    toast(exists ? 'Removed from wishlist' : 'Saved to wishlist', exists ? 'default' : 'success');
    if (user) {
      try {
        if (exists) await api.removeWishlist(product.id);
        else await api.addWishlist(product);
      } catch (e) {
        toast(e.message, 'error');
      }
    }
  }, [wishlist, user, toast]);

  const toggleCompare = useCallback((product) => {
    if (compare.some((p) => p.id === product.id)) {
      setCompare((c) => c.filter((p) => p.id !== product.id));
      return;
    }
    if (compare.length >= MAX_COMPARE) {
      toast(`You can compare up to ${MAX_COMPARE} products`, 'error');
      return;
    }
    setCompare((c) => [...c, product]);
    toast('Added to compare', 'success');
  }, [compare, toast]);

  const clearCompare = useCallback(() => setCompare([]), []);

  const value = useMemo(() => ({
    wishlist, compare, toasts, toast, inWishlist, inCompare, toggleWishlist, toggleCompare, clearCompare,
    activeProduct, openProduct: setActiveProduct, closeProduct: () => setActiveProduct(null),
  }), [wishlist, compare, toasts, toast, inWishlist, inCompare, toggleWishlist, toggleCompare, clearCompare, activeProduct]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useShop = () => useContext(ShopContext);
