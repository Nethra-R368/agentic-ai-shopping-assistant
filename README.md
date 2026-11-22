# AuraBuy: AI Shopping Concierge

AuraBuy is a full-stack web app that helps shoppers in India decide what to buy. You describe what you need by **text, voice or photo**. AuraBuy searches stores, ranks the options and explains which one to buy and why. It also lets you compare finalists side by side, save them to a wishlist, and set price-drop alerts.

**Stack:** React 19 · Vite · Tailwind CSS 4 · FastAPI · LangGraph · Google Gemini · SerpAPI (Google Shopping) · MongoDB · JWT auth

---

## Features

| | |
|---|---|
| **Conversational search** | "Best laptop for coding under ₹70,000". The app reads your budget (`₹1 lakh`, `25k`, `under 3,499`) and filters results to fit it. |
| **Explained picks** | Every product gets a badge (Best overall / Best value / Top rated…), a one-line "why it fits", and honest pros and cons drawn from real price, rating, review and discount data. |
| **Agentic follow-ups** | "Compare the top 2", "anything cheaper?", "which has better battery?" go to a LangGraph tool-calling agent that keeps the conversation context. |
| **Photo search** | Upload, paste or drag an image. Gemini Vision describes it and searches for the item or for things that match it. |
| **Voice** | Speech-to-text input and read-aloud answers, using the Web Speech API. |
| **Live streaming** | Answers stream over Server-Sent Events. The progress steps you see ("Searching stores for…", "Analysing 6 options") are the real pipeline steps. |
| **Compare** | Line up 2–4 products. You get a spec table with per-row winners and an AI verdict, optionally tuned to your use case. |
| **Wishlist** | Works as a guest (saved in the browser). When you sign in, it merges into your account. |
| **Price alerts** | Set a target price, track the current and lowest price with a sparkline, and refresh prices on demand. |
| **Accounts and history** | JWT auth with bcrypt-hashed passwords. Chats are saved per account, and the API returns a user's conversations only to that user. |
| **Polish** | Light and dark themes, responsive down to phone width, keyboard and screen-reader friendly, skeleton loaders. |

### Works with zero setup (graceful degradation)

Every API key is optional, so the app always runs:

| Keys configured | Product data | Reasoning |
|---|---|---|
| none (**demo mode**) | Sample catalog ([DummyJSON](https://dummyjson.com)) | Rule-based insights from real data fields |
| `GEMINI_API_KEY` | Gemini suggests real models with estimated prices; links go to Google Shopping search | Gemini summaries, pros/cons, compare verdicts, agent and vision |
| `+ SERPAPI_API_KEY` | **Live Google Shopping listings**: prices, images, store links, ratings | Gemini |
| `+ MONGO_URI` | Accounts, wishlists, alerts and chats persist across restarts (otherwise an in-memory DB) | |

The site shows a banner in demo mode, and marks AI-estimated prices as estimates. It never makes up links or prices and presents them as real.

---

## Architecture

```
React (Vite) ──SSE /api/chat/stream──▶ FastAPI
                                        │
                     ┌── route: "search" (simple queries) ──────────────┐
                     │   search_products() ─▶ cache ─▶ SerpAPI ─▶ Gemini ─▶ demo
                     │   insights.enrich()  ─▶ 1 Gemini call: summary + per-product why/pros/cons/badge
                     │
                     └── route: "agent" (compare / follow-ups / images / questions)
                         LangGraph: agent ⇄ product_search tool (≤3 rounds), token-streamed
                                        │
                                   MongoDB: users · wishlist · alerts · conversations · query_cache
```

* **Routing** (`backend/api/chat.py`): regex heuristics send simple searches down a fast single-LLM-call path. Comparisons, follow-ups that refer to earlier results, and image queries go to the agent.
* **Conversation memory** is stored in MongoDB and replayed into the agent each turn, including the products already shown. So "the second one" resolves correctly, and memory survives restarts.
* **Caching:** identical searches within an hour are served from `query_cache`.

### Project layout

```
backend/
  main.py                 FastAPI app, CORS, routers, /health
  api/                    auth · chat (+ conversations) · products (search, trending, compare) · wishlist · alerts
  agents/                 LangGraph graph, agent node, system prompt
  services/               search (providers + budget parsing) · insights (LLM + rule-based) · llm helpers
  tools/product_search.py LangChain tool used by the agent
  database/mongodb.py     Motor client, with a mongomock fallback
  tests/test_api.py       end-to-end API tests (demo mode)
frontend/src/
  pages/                  Home · Assistant · Compare · Wishlist · Alerts · Auth · NotFound
  components/             Layout (nav, toasts, compare tray) · ProductCard · ProductModal · SearchBar
  context/                AuthContext · ShopContext (wishlist, compare, toasts)
  lib/api.js              REST client + SSE stream parser
```

---

## Run locally

Prerequisites: Python 3.11+ and Node 20+.

**Backend** (http://localhost:8000, API docs at `/docs`)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # optional: add your keys
uvicorn main:app --reload
```

**Frontend** (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

**Tests**

```bash
cd backend && pytest -q          # 10 end-to-end API tests, no keys or network needed
cd frontend && npm run lint && npm run build
```

### Environment variables

Backend (`backend/.env`, see `.env.example`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key. Turns on AI reasoning, the agent and image search |
| `GEMINI_MODEL` | Defaults to `gemini-3.1-flash-lite` |
| `SERPAPI_API_KEY` | Live Google Shopping results |
| `MONGO_URI` | MongoDB Atlas connection string (in-memory if unset) |
| `JWT_SECRET` | **Required in production.** A long random string |
| `CORS_ORIGINS` | Comma-separated frontend URLs (`*.vercel.app` is also allowed) |
| `SEARCH_COUNTRY` | Google Shopping country, default `in` |

Frontend: `VITE_API_URL`, the backend URL.

---

## Deploy

* **Backend → Render:** `backend/render.yaml` is a ready blueprint (health check, auto-generated `JWT_SECRET`). Add `GEMINI_API_KEY`, `SERPAPI_API_KEY`, `MONGO_URI` and `CORS_ORIGINS` in the dashboard.
* **Frontend → Vercel:** set the root directory to `frontend` and set `VITE_API_URL` to your Render URL. `vercel.json` handles client-side routing.
* **CI:** GitHub Actions runs the backend tests and the frontend lint and build on every push.

## Roadmap

- Scheduled background price checks with email notifications
- Price history charts from multiple stores
- Browser extension for "is this a good deal?" on product pages
- Personalised recommendations from wishlist history
