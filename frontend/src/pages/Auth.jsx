import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const { toast } = useShop();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = isLogin ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
      toast(`Welcome${isLogin ? ' back' : ''}, ${user.name.split(' ')[0]}!`, 'success');
      navigate(location.state?.from || '/assistant', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <Wordmark />
        <h1 className="mt-6 text-4xl">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin ? 'Sign in to sync your wishlist, chats and price alerts.' : 'Save products, keep your chats and get price-drop alerts.'}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Name</label>
              <input id="name" required autoComplete="name" value={form.name} onChange={set('name')} className="input" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className="input" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <input id="password" type="password" required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={form.password} onChange={set('password')} className="input" />
            {!isLogin && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
          </div>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {isLogin ? 'New to AuraBuy? ' : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} state={location.state} className="font-semibold text-brand hover:underline">
            {isLogin ? 'Create an account' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
}
