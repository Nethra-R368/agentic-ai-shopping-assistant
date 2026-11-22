import { useEffect, useState } from 'react';
import { BellRing, Check, Pencil, RefreshCw, Trash2, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { api } from '../lib/api';
import { inr, timeAgo } from '../lib/format';

function Sparkline({ history }) {
  const pts = (history || []).map((h) => h.price).filter(Boolean);
  if (pts.length < 2) return <span className="text-xs text-muted">Tracking started</span>;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const w = 120;
  const h = 32;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${max === min ? h / 2 : h - ((p - min) / (max - min)) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label="Price history">
      <polyline points={d} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function AlertRow({ alert, onChange, onDelete }) {
  const { openProduct, toast } = useShop();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(alert.target_price);

  const save = async (e) => {
    e.preventDefault();
    try {
      onChange(await api.updateAlert(alert.id, Number(target)));
      setEditing(false);
    } catch (err) { toast(err.message, 'error'); }
  };
  const gap = alert.current_price - alert.target_price;

  return (
    <div className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${alert.triggered ? 'border-success/50' : ''}`}>
      <button onClick={() => openProduct(alert.product)} className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line cursor-pointer">
        <ProductImage product={alert.product} className="h-full w-full" />
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={() => openProduct(alert.product)} className="line-clamp-1 text-left font-semibold hover:text-brand cursor-pointer">{alert.product.name}</button>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>Now <b className="text-ink">{inr(alert.current_price)}</b></span>
          <span>Lowest {inr(alert.lowest_price)}</span>
          <span>Checked {timeAgo(alert.last_checked)}</span>
        </div>
        {alert.triggered ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
            <TrendingDown className="h-3.5 w-3.5" /> At or below your target — good time to buy
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted">{inr(gap)} above your target</div>
        )}
      </div>
      <Sparkline history={alert.history} />
      <div className="flex items-center gap-2">
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-2">
            <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} className="input w-28" aria-label="Target price" autoFocus />
            <button className="btn-icon border border-line" aria-label="Save target"><Check className="h-4 w-4" /></button>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-ghost h-9 text-xs">Target {inr(alert.target_price)} <Pencil className="h-3.5 w-3.5" /></button>
        )}
        <button onClick={() => onDelete(alert.id)} className="btn-icon h-9 w-9 hover:text-danger" aria-label="Delete alert"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function Alerts() {
  const { user, ready } = useAuth();
  const { toast } = useShop();
  const [alerts, setAlerts] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user) api.alerts().then(setAlerts).catch((e) => { toast(e.message, 'error'); setAlerts([]); });
  }, [user, toast]);

  if (!ready) return null;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <BellRing className="mx-auto h-8 w-8 text-muted" strokeWidth={1.5} />
        <h1 className="mt-5 text-5xl">Price alerts</h1>
        <p className="mt-2 text-muted">Sign in to set target prices on products and track when they drop.</p>
        <Link to="/login" state={{ from: '/alerts' }} className="btn-primary mt-8">Sign in</Link>
      </div>
    );
  }

  const checkNow = async () => {
    setChecking(true);
    try { setAlerts(await api.checkAlerts()); toast('Prices refreshed', 'success'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setChecking(false); }
  };
  const remove = async (id) => {
    setAlerts((a) => a.filter((x) => x.id !== id));
    try { await api.deleteAlert(id); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Price alerts</h1>
          <p className="mt-1 text-muted">Open any product and choose “Set alert” to start tracking it.</p>
        </div>
        {alerts?.length > 0 && (
          <button onClick={checkNow} disabled={checking} className="btn-ghost">
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} /> {checking ? 'Checking…' : 'Check prices now'}
          </button>
        )}
      </div>
      <div className="mt-8 space-y-3">
        {alerts === null && [0, 1].map((i) => <div key={i} className="skeleton h-28" />)}
        {alerts?.length === 0 && (
          <div className="card p-10 text-center text-muted">No alerts yet. <Link to="/assistant" className="font-semibold text-brand hover:underline">Find something to track</Link>.</div>
        )}
        {alerts?.map((a) => (
          <AlertRow key={a.id} alert={a} onDelete={remove} onChange={(u) => setAlerts((all) => all.map((x) => (x.id === u.id ? u : x)))} />
        ))}
      </div>
    </div>
  );
}
