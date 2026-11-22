import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'markdown-to-jsx';
import { Check, Copy, MessageSquarePlus, PanelLeft, Square, Trash2, Volume2, X } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Logo from '../components/Logo';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { api, streamChat } from '../lib/api';
import { providerLabel, readStore, timeAgo, uuid, writeStore } from '../lib/format';

const LOCAL_KEY = 'aurabuy.chats';
const STARTERS = [
  'Best phone under ₹25,000 with a great camera',
  'Compare iPhone 15 vs Samsung Galaxy S24',
  'Wireless earbuds for the gym under ₹3,000',
  'A thoughtful gift for my dad who loves cooking',
];

// ---------------------------------------------------------------- local (guest) history
const localChats = () => readStore(LOCAL_KEY, {});
function saveLocalChat(id, messages) {
  const chats = localChats();
  const first = messages.find((m) => m.role === 'user');
  chats[id] = {
    title: first?.content?.slice(0, 60) || 'New chat',
    updated_at: Date.now() / 1000,
    messages: messages.filter((m) => !m.pending).map(({ image, ...m }) => ({ ...m, image: !!image })),
  };
  const ids = Object.keys(chats).sort((a, b) => chats[b].updated_at - chats[a].updated_at);
  ids.slice(30).forEach((k) => delete chats[k]);
  writeStore(LOCAL_KEY, chats);
}

function useConversations(user, refreshKey) {
  const [serverList, setServerList] = useState([]);
  useEffect(() => {
    if (user) api.conversations().then(setServerList).catch(() => setServerList([]));
  }, [user, refreshKey]);
  const localList = useMemo(() => {
    if (user || refreshKey < 0) return [];
    return Object.entries(localChats())
      .map(([id, c]) => ({ id, title: c.title, updated_at: c.updated_at }))
      .sort((a, b) => b.updated_at - a.updated_at);
  }, [user, refreshKey]);
  return user ? serverList : localList;
}

// ---------------------------------------------------------------- message view
function AssistantMessage({ msg, onFollowUp, aiEnabled }) {
  const { toggleCompare, inCompare } = useShop();
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(msg.content.replace(/[*#>_`|]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1'));
    u.lang = 'en-IN';
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const products = msg.products || [];
  const followUps = [];
  if (products.length > 1) {
    if (aiEnabled) {
      followUps.push({ label: `Compare the top 2`, text: `Compare ${products[0].name} and ${products[1].name}. Which should I buy?` });
      followUps.push({ label: 'Show cheaper options', text: 'Show me cheaper alternatives to these.' });
    } else {
      followUps.push({
        label: 'Add top 2 to compare',
        action: () => products.slice(0, 2).forEach((p) => !inCompare(p.id) && toggleCompare(p)),
      });
    }
  }

  return (
    <div className="flex gap-3">
      <Logo className="mt-1 h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-4">
        {msg.pending && !msg.content && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="flex gap-1"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
            <span>{msg.status || 'Thinking'}…</span>
          </div>
        )}
        {msg.content && (
          <div className={`prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-strong:text-ink prose-a:text-brand prose-blockquote:border-brand/40 prose-blockquote:text-muted prose-blockquote:not-italic ${msg.error ? 'text-danger' : ''}`}>
            <Markdown options={{ forceBlock: true, overrides: { a: { props: { target: '_blank', rel: 'noopener noreferrer' } } } }}>
              {msg.content}
            </Markdown>
          </div>
        )}
        {msg.pending && msg.content && msg.status && <div className="text-xs text-muted">{msg.status}…</div>}
        {products.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-muted">
              <span>{products.length} {products.length === 1 ? 'product' : 'products'}</span>
              {msg.provider && <><span>·</span><span>{providerLabel[msg.provider] || msg.provider}</span></>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        )}
        {!msg.pending && msg.content && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={speak} className="btn-icon h-8 w-8" title={speaking ? 'Stop' : 'Read aloud'} aria-label={speaking ? 'Stop reading' : 'Read aloud'}>
              {speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button onClick={copy} className="btn-icon h-8 w-8" title="Copy" aria-label="Copy answer">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
            {followUps.map((f) => (
              <button key={f.label} onClick={() => (f.action ? f.action() : onFollowUp(f.text))} className="chip py-1.5 text-xs">{f.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] space-y-2">
        {typeof msg.image === 'string' && <img src={msg.image} alt="Your upload" className="ml-auto max-h-48 rounded-2xl border border-line" />}
        {msg.image === true && <div className="ml-auto w-fit rounded-xl bg-surface-2 px-3 py-1 text-xs text-muted">📷 Image</div>}
        <div className="rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] text-white">{msg.content}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Assistant() {
  const { id: routeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useShop();

  const [sessionId, setSessionId] = useState(() => routeId || uuid());
  const [messages, setMessages] = useState(() => (routeId ? localChats()[routeId]?.messages || [] : []));
  const [shownRoute, setShownRoute] = useState(routeId);
  const startedHere = useRef(new Set()); // sessions begun on this page don't need reloading
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(true);
  const conversations = useConversations(user, refreshKey);
  const abortRef = useRef(null);
  const endRef = useRef(null);
  const handledKey = useRef(null);

  useEffect(() => { api.health().then((h) => setAiEnabled(!!h.ai)).catch(() => {}); }, []);
  // Note: no abort-on-unmount. StrictMode's simulated remount would cancel the first
  // request; a reply that finishes after leaving the page is simply discarded.

  // Switch conversation when the URL points at a different one (adjusted during render).
  if (routeId !== shownRoute) {
    setShownRoute(routeId);
    if (routeId && routeId !== sessionId) {
      setSessionId(routeId);
      setMessages(user ? [] : localChats()[routeId]?.messages || []);
    }
  }

  // Signed-in users' conversations live on the server.
  useEffect(() => {
    if (!user || !routeId || startedHere.current.has(routeId)) return;
    let live = true;
    api.conversation(routeId)
      .then((c) => live && setMessages(c.messages))
      .catch(() => {});
    return () => { live = false; };
  }, [routeId, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const send = useCallback(async ({ message, image }, opts = {}) => {
    const sid = opts.sessionId || sessionId;
    const prior = opts.reset ? [] : messages;
    const next = [...prior, { role: 'user', content: message, image }, { role: 'assistant', content: '', pending: true, status: 'Thinking' }];
    setMessages(next);
    setBusy(true);
    startedHere.current.add(sid);
    if (routeId !== sid) navigate(`/assistant/${sid}`, { replace: true, state: null });

    const controller = new AbortController();
    abortRef.current = controller;
    const update = (fn) => setMessages((ms) => {
      const copy = ms.slice();
      copy[copy.length - 1] = fn(copy[copy.length - 1]);
      return copy;
    });

    await streamChat({
      message, image, sessionId: sid, signal: controller.signal,
      onEvent: (type, data) => {
        if (type === 'status') update((m) => ({ ...m, status: data.text }));
        else if (type === 'products') update((m) => ({ ...m, products: data.products, provider: data.provider }));
        else if (type === 'token') update((m) => ({ ...m, content: m.content + data.text }));
        else if (type === 'error') update((m) => ({ ...m, content: data.detail || 'Something went wrong.', error: true, pending: false }));
        else if (type === 'done') update((m) => ({ ...m, pending: false, status: null, provider: m.provider || data.provider }));
      },
    });

    setMessages((ms) => {
      const final = ms.map((m) => (m.pending ? { ...m, pending: false, status: null } : m));
      if (!user) saveLocalChat(sid, final);
      return final;
    });
    setBusy(false);
    setRefreshKey((k) => k + 1);
  }, [messages, sessionId, routeId, navigate, user]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    const id = uuid();
    setSessionId(id);
    setMessages([]);
    setSidebar(false);
    navigate('/assistant');
    return id;
  }, [navigate]);

  // Handle a query handed over from the home page / product modal.
  useEffect(() => {
    const q = location.state?.q;
    if (!q || handledKey.current === location.key) return;
    handledKey.current = location.key;
    const id = location.state.fresh ? uuid() : sessionId;
    setSessionId(id);
    send({ message: q, image: location.state.image }, { sessionId: id, reset: !!location.state.fresh });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const removeConversation = async (id) => {
    try {
      if (user) await api.deleteConversation(id);
      else { const c = localChats(); delete c[id]; writeStore(LOCAL_KEY, c); }
      setRefreshKey((k) => k + 1);
      if (id === sessionId) newChat();
    } catch (e) { toast(e.message, 'error'); }
  };

  const Sidebar = (
    <div className="flex h-full flex-col gap-3 p-3">
      <button onClick={newChat} className="btn-primary w-full"><MessageSquarePlus className="h-4 w-4" /> New chat</button>
      <div className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent</div>
      <div className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1 scrollbar-thin">
        {conversations.length === 0 && <p className="px-2 text-sm text-muted">Your chats will appear here.</p>}
        {conversations.map((c) => (
          <div key={c.id} className={`group flex items-center rounded-lg ${c.id === sessionId ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
            <button onClick={() => { setSidebar(false); navigate(`/assistant/${c.id}`); }} className="min-w-0 flex-1 px-3 py-2 text-left cursor-pointer">
              <div className="truncate text-sm">{c.title}</div>
              <div className="text-[11px] text-muted">{timeAgo(c.updated_at)}</div>
            </button>
            <button onClick={() => removeConversation(c.id)} className="mr-1 hidden rounded p-1.5 text-muted hover:text-danger group-hover:block cursor-pointer" aria-label={`Delete ${c.title}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {!user && <p className="px-2 text-xs text-muted">Chats are saved in this browser. Sign in to keep them across devices.</p>}
    </div>
  );

  return (
    <div className="mx-auto flex h-full max-w-7xl">
      <aside className="hidden w-72 shrink-0 border-r border-line lg:block">{Sidebar}</aside>
      {sidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebar(false)}>
          <aside className="h-full w-72 bg-surface" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end p-2"><button className="btn-icon" onClick={() => setSidebar(false)} aria-label="Close chats"><X className="h-5 w-5" /></button></div>
            {Sidebar}
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 lg:hidden">
          <button className="btn-icon" onClick={() => setSidebar(true)} aria-label="Show chats"><PanelLeft className="h-5 w-5" /></button>
          <span className="text-sm font-medium">Assistant</span>
          <button className="btn-icon ml-auto" onClick={newChat} aria-label="New chat"><MessageSquarePlus className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
            {messages.length === 0 ? (
              <div className="pt-10 text-center">
                <Logo className="mx-auto h-14 w-14" />
                <h1 className="mt-5 text-3xl font-bold">What are you shopping for?</h1>
                <p className="mx-auto mt-2 max-w-md text-muted">Ask in plain words, add a budget, upload a photo, or tap the mic.</p>
                <div className="mx-auto mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send({ message: s })} className="card p-4 text-left text-sm hover:border-brand/50 cursor-pointer">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (m.role === 'user'
                ? <UserMessage key={i} msg={m} />
                : <AssistantMessage key={i} msg={m} aiEnabled={aiEnabled} onFollowUp={(text) => send({ message: text })} />))
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-line bg-bg/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-4xl">
            <SearchBar size="sm" onSubmit={(m) => send(m)} disabled={busy} placeholder="Ask a follow-up or search for something new…" />
            <p className="mt-2 text-center text-[11px] text-muted">AuraBuy can make mistakes. Check prices and details on the store before buying.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
