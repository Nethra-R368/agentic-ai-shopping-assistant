const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'aurabuy.token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method, signal, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError("Can't reach the AuraBuy server. Is the backend running?", 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    let msg = data?.detail;
    if (Array.isArray(msg)) msg = msg.map((d) => d.msg?.replace(/^Value error, /, '')).join(' ');
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  // auth
  register: (name, email, password) => request('/api/auth/register', { method: 'POST', body: { name, email, password } }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
  // products
  trending: () => request('/api/products/trending'),
  search: (q) => request(`/api/products/search?q=${encodeURIComponent(q)}`),
  compare: (products, useCase) => request('/api/products/compare', { method: 'POST', body: { products, use_case: useCase || null } }),
  // wishlist
  wishlist: () => request('/api/wishlist'),
  addWishlist: (product) => request('/api/wishlist', { method: 'POST', body: product }),
  syncWishlist: (products) => request('/api/wishlist/sync', { method: 'POST', body: products }),
  removeWishlist: (id) => request(`/api/wishlist/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  // alerts
  alerts: () => request('/api/alerts'),
  createAlert: (product, targetPrice) => request('/api/alerts', { method: 'POST', body: { product, target_price: targetPrice } }),
  updateAlert: (id, targetPrice) => request(`/api/alerts/${id}`, { method: 'PATCH', body: { target_price: targetPrice } }),
  deleteAlert: (id) => request(`/api/alerts/${id}`, { method: 'DELETE' }),
  checkAlerts: () => request('/api/alerts/check', { method: 'POST' }),
  // conversations
  conversations: () => request('/api/conversations'),
  conversation: (id) => request(`/api/conversations/${encodeURIComponent(id)}`),
  deleteConversation: (id) => request(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

/**
 * Stream a chat turn over Server-Sent Events.
 * onEvent(type, data) is called for: status, products, token, done, error.
 */
export async function streamChat({ message, image, sessionId, signal, onEvent }) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST', signal, headers: headers(),
      body: JSON.stringify({ message, image: image || null, session_id: sessionId }),
    });
  } catch (e) {
    if (e.name === 'AbortError') return;
    onEvent('error', { detail: "Can't reach the AuraBuy server. Is the backend running?" });
    return;
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    onEvent('error', { detail: data?.detail || `Request failed (${res.status})` });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let type = 'message';
      let data = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) type = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      try { onEvent(type, data ? JSON.parse(data) : {}); } catch { /* skip malformed */ }
    }
  }
}
