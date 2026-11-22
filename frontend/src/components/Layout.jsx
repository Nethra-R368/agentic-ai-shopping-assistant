import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, GitCompareArrows, Heart, LogOut, Menu, MessageSquareText, Moon, Sun, User, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { api } from '../lib/api';
import { Wordmark } from './Logo';
import ProductModal from './ProductModal';

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  // Follows the system theme until the user picks one explicitly.
  const choose = (value) => {
    setDark(value);
    document.documentElement.classList.toggle('dark', value);
    try { localStorage.setItem('aurabuy.theme', value ? 'dark' : 'light'); } catch { /* ignore */ }
  };
  return [dark, choose];
}

const NAV = [
  { to: '/assistant', label: 'Assistant', icon: MessageSquareText },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows, count: 'compare' },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, count: 'wishlist' },
  { to: '/alerts', label: 'Price alerts', icon: Bell },
];

function Navbar() {
  const { user, logout } = useAuth();
  const shop = useShop();
  const [dark, setDark] = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Close menus whenever the route changes (state adjusted during render, not in an effect).
  const [path, setPath] = useState(location.pathname);
  if (path !== location.pathname) {
    setPath(location.pathname);
    setOpen(false);
    setMenu(false);
  }

  const linkClass = ({ isActive }) =>
    `relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${isActive ? 'text-ink font-medium bg-surface-2' : 'text-muted hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center" aria-label="AuraBuy home">
          <Wordmark />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, count }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="h-4 w-4" /> {label}
              {count && shop[count].length > 0 && (
                <span className="font-mono text-[11px] text-brand">{shop[count].length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setDark(!dark)} className="btn-icon" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-surface-2 cursor-pointer" aria-haspopup="menu" aria-expanded={menu}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-on-primary">
                  {user.name[0]?.toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{user.name.split(' ')[0]}</span>
              </button>
              {menu && (
                <div role="menu" className="card absolute right-0 mt-2 w-56 p-1.5">
                  <div className="px-3 py-2 text-xs text-muted truncate">{user.email}</div>
                  <button role="menuitem" onClick={() => { logout(); navigate('/'); shop.toast('Signed out'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2 cursor-pointer">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden h-10 sm:inline-flex"><User className="h-4 w-4" /> Sign in</Link>
          )}
          <button onClick={() => setOpen(!open)} className="btn-icon md:hidden" aria-label="Open menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line md:hidden" aria-label="Mobile"
          >
            <div className="flex flex-col gap-1 p-3">
              {NAV.map(({ to, label, icon: Icon, count }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon className="h-4 w-4" /> {label}
                  {count && shop[count].length > 0 && <span className="ml-auto text-xs">{shop[count].length}</span>}
                </NavLink>
              ))}
              {!user && <Link to="/login" className="btn-primary mt-2">Sign in</Link>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function CompareTray() {
  const { compare, toggleCompare, clearCompare } = useShop();
  const location = useLocation();
  if (compare.length === 0 || location.pathname === '/compare' || location.pathname.startsWith('/assistant')) return null;
  return (
    <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <div className="card flex w-full max-w-xl items-center gap-3 p-2.5 pl-4 shadow-lg">
        <div className="flex -space-x-2">
          {compare.map((p) => (
            <button key={p.id} onClick={() => toggleCompare(p)} title={`Remove ${p.name}`} className="h-9 w-9 overflow-hidden rounded-full border-2 border-surface bg-white cursor-pointer">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-contain" /> : <span className="text-xs">{p.name[0]}</span>}
            </button>
          ))}
        </div>
        <span className="text-sm font-medium">{compare.length} to compare</span>
        <button onClick={clearCompare} className="ml-auto text-sm text-muted hover:text-ink cursor-pointer">Clear</button>
        <Link to="/compare" className={`btn-primary h-9 ${compare.length < 2 ? 'pointer-events-none opacity-50' : ''}`}>Compare</Link>
      </div>
    </motion.div>
  );
}

function Toasts() {
  const { toasts } = useShop();
  const tone = { success: 'border-success/40', error: 'border-danger/50', default: 'border-line' };
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] flex flex-col items-end gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            className={`card px-4 py-2.5 text-sm font-medium ${tone[t.tone] || tone.default}`}>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ModeBanner() {
  const [health, setHealth] = useState(null);
  const [state, setState] = useState('checking'); // checking | waking | ok | offline
  useEffect(() => {
    // Free hosting sleeps when idle; tell people why the first request is slow.
    const slow = setTimeout(() => setState((s) => (s === 'checking' ? 'waking' : s)), 2500);
    const ctrl = new AbortController();
    const giveUp = setTimeout(() => ctrl.abort(), 75000);
    api.health(ctrl.signal)
      .then((h) => { setHealth(h); setState('ok'); })
      .catch(() => setState('offline'))
      .finally(() => { clearTimeout(slow); clearTimeout(giveUp); });
    return () => { clearTimeout(slow); clearTimeout(giveUp); };
  }, []);
  const base = 'border-b border-line px-4 py-2 text-center text-[13px]';
  if (state === 'waking') {
    return <div className={`${base} bg-surface-2 text-muted`}><span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand align-middle" />Waking up the server — the free hosting naps when idle. This takes up to 30 seconds, once.</div>;
  }
  if (state === 'offline') {
    return <div className={`${base} bg-brand-soft text-danger`}>Can't reach the AuraBuy server right now. Please refresh in a minute.</div>;
  }
  if (health?.mode === 'demo') {
    return <div className={`${base} bg-surface-2 text-muted`}>Demo mode — results come from a sample catalog.</div>;
  }
  return null;
}

function Footer() {
  return (
    <footer className="mt-28 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            A shopping assistant that reads the specs, prices and reviews for you, then tells you plainly which one to buy.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
          <span className="eyebrow mb-1">Use it</span>
          <Link to="/assistant" className="text-muted hover:text-ink">Assistant</Link>
          <Link to="/compare" className="text-muted hover:text-ink">Compare</Link>
          <Link to="/wishlist" className="text-muted hover:text-ink">Wishlist</Link>
          <Link to="/alerts" className="text-muted hover:text-ink">Price alerts</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">Good to know</span>
          <p className="text-muted">AuraBuy doesn't sell anything or take commissions. It links you to the store — always check the final price there.</p>
          <a href="https://github.com/Nethra-R368/agentic-ai-shopping-assistant" target="_blank" rel="noopener noreferrer" className="text-muted underline underline-offset-2 hover:text-ink">Source on GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();
  const fullBleed = location.pathname.startsWith('/assistant');
  return (
    <div className={fullBleed ? 'flex h-dvh flex-col overflow-hidden' : 'flex min-h-screen flex-col'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-primary">Skip to content</a>
      <ModeBanner />
      <Navbar />
      <main id="main" className="min-h-0 flex-1">
        <Outlet />
      </main>
      {!fullBleed && <Footer />}
      <CompareTray />
      <ProductModal />
      <Toasts />
    </div>
  );
}
