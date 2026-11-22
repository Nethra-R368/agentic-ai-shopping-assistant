import { useEffect, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { ExternalLink, GitCompareArrows, Sparkles, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import { useShop } from '../context/ShopContext';
import { api } from '../lib/api';
import { inr } from '../lib/format';

export default function Compare() {
  const { compare, toggleCompare, clearCompare, openProduct } = useShop();
  const [useCase, setUseCase] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ids = compare.map((p) => p.id).join(',');

  const run = async (e) => {
    e?.preventDefault();
    if (compare.length < 2) return;
    setLoading(true);
    setError('');
    try {
      setResult(await api.compare(compare, useCase));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [shownIds, setShownIds] = useState(ids);
  if (shownIds !== ids) {
    setShownIds(ids);
    setResult(null);
  }

  // Re-run the comparison whenever the set of products changes.
  useEffect(() => {
    if (compare.length < 2) return;
    let live = true;
    api.compare(compare, useCase)
      .then((r) => live && setResult(r))
      .catch((err) => live && setError(err.message));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (compare.length < 2) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><GitCompareArrows className="h-7 w-7" /></div>
        <h1 className="mt-5 text-3xl font-bold">Compare products</h1>
        <p className="mt-2 text-muted">
          Add 2–4 products using the <GitCompareArrows className="inline h-4 w-4" /> button on any product card.
          {compare.length === 1 && ' You have 1 so far — add one more.'}
        </p>
        <Link to="/assistant" className="btn-primary mt-8">Find products</Link>
      </div>
    );
  }

  const winner = result?.winner_index;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Compare</h1>
          <p className="mt-1 text-muted">{compare.length} products side by side.</p>
        </div>
        <button onClick={clearCompare} className="btn-ghost">Clear all</button>
      </div>

      <form onSubmit={run} className="card mt-6 flex flex-col gap-2 p-3 sm:flex-row">
        <input value={useCase} onChange={(e) => setUseCase(e.target.value)} className="input flex-1 border-0 focus:ring-0"
          placeholder="Optional: what will you use it for? e.g. “video editing and travel”" aria-label="Use case" />
        <button className="btn-primary" disabled={loading}><Sparkles className="h-4 w-4" /> {loading ? 'Comparing…' : 'Get verdict'}</button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {(loading || result || !error) && (
        <div className="card mt-6 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand"><Trophy className="h-4 w-4" /> Verdict {result?.ai && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px]">AI</span>}</div>
          {!result ? (
            <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-4/5" /></div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-strong:text-ink"><Markdown>{result.verdict}</Markdown></div>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 w-40 bg-bg" />
              {compare.map((p, i) => (
                <th key={p.id} className="p-2 align-top font-normal">
                  <div className={`card relative overflow-hidden text-left ${winner === i ? 'border-brand ring-2 ring-brand/30' : ''}`}>
                    {winner === i && <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Winner</span>}
                    <button onClick={() => toggleCompare(p)} className="btn-icon absolute right-1 top-1 z-10 h-8 w-8 bg-surface/80" aria-label={`Remove ${p.name}`}><X className="h-4 w-4" /></button>
                    <button onClick={() => openProduct(p)} className="block w-full cursor-pointer"><ProductImage product={p} className="aspect-[4/3] w-full" /></button>
                    <div className="space-y-2 p-3">
                      <div className="line-clamp-2 font-semibold">{p.name}</div>
                      <div className="text-lg font-bold">{inr(p.price)}</div>
                      {p.product_url && (
                        <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="btn-ghost h-8 w-full text-xs">
                          {p.provider === 'serpapi' ? 'View deal' : 'Compare prices'} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(result?.rows || []).map((row) => (
              <tr key={row.label}>
                <th scope="row" className="sticky left-0 border-t border-line bg-bg p-3 text-left font-medium text-muted">{row.label}</th>
                {row.values.map((v, i) => (
                  <td key={i} className={`border-t border-line p-3 ${row.winner === i ? 'font-semibold text-success' : ''}`}>
                    {v}{row.winner === i && ' ✓'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
