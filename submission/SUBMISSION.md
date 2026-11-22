# AuraBuy submission kit

Everything you need for Devpost, Unstop, Devfolio or an internship review.

- **Live demo:** https://agentic-ai-shopping-assistant.vercel.app
- **Code:** https://github.com/Nethra-R368/agentic-ai-shopping-assistant
- **Video:** `video/aurabuy-demo.mp4` (silent screen recording; record your voice over it using the script below)
- **Screenshots:** `screenshots/` (1440×900 at 2× resolution, plus mobile)

> Tip: open the live link once about a minute before you present. The free backend sleeps when idle, and the site shows a "waking up" note for up to 30 seconds the first time.

---

## Voice-over script (about 1 min 30 s)

Read it at a relaxed pace. Each block lines up with a scene in the video (`video/scenes.txt` has the exact timestamps).

| Scene | Say this |
|---|---|
| **Home** (0:00) | "Online shopping in India means twenty open tabs: Amazon, Flipkart, reviews, YouTube. I built **AuraBuy** to do that research for you. You tell it what you need, and it tells you what to buy, and why." |
| **Search** (0:17) | "I'll ask in plain words, with a budget: *best laptop for coding under seventy thousand rupees.* AuraBuy reads the budget and searches for options that actually fit it." |
| **Answer** (0:25) | "Instead of a wall of links, I get one clear pick with the reasoning and the trade-off, plus ranked options. Every card has a badge like *best value* or *top rated*, and the pros and cons come from real price, rating and review data." |
| **Details** (0:34) | "Opening a product shows why it fits *my* request, its specs, and a link to compare live store prices. I can also set a price-drop alert from here." |
| **Follow-up** (0:41) | "Now a harder question: *iPhone 15 or Galaxy S24?* This goes to a LangGraph agent. It decides to search for each phone separately, then writes a side-by-side table and a verdict on who should pick which." |
| **Compare** (1:00) | "I can add finalists to Compare. The table marks the winner on each row, like price, rating and specs, and the AI writes a verdict that I can tune to my use case." |
| **Wishlist** (1:16) | "Products I like go to my wishlist. It works without an account, and syncs to my account when I sign in, along with my chats and price alerts." |
| **Dark mode / end** (1:21) | "It also has voice input, photo search and dark mode, and works on phones. Under the hood: React, FastAPI, LangGraph and Gemini, with streaming responses and tests running in CI. That's AuraBuy: less scrolling, better buying." |

### How to add your voice
1. Open `video/aurabuy-demo.mp4` in **Clipchamp** (built into Windows 11).
2. Click **Record & create → Audio**, or record on your phone and import the file.
3. Drag your audio under the video and trim it to fit. Export at 1080p.
4. Upload to YouTube (Unlisted is fine) and paste the link into the hackathon form.

---

## Copy-paste: project description

**Name:** AuraBuy

**Tagline (≤ 60 chars):** Tell it what you need. It tells you what to buy.

**Short description (≤ 200 chars):**
An AI shopping assistant for India. Ask by text, voice or photo, and get one clear pick, ranked options with honest pros and cons, side-by-side comparisons and price alerts.

**Inspiration**
Buying anything over ₹5,000 in India means hours across Amazon, Flipkart, review videos and spec sheets, and you still aren't sure. We wanted the friend who already did that research to just tell us what to buy, and why.

**What it does**
- Understands natural requests with budgets ("under ₹1 lakh", "25k") by text, voice or photo
- Searches stores and returns one recommendation with reasoning, plus up to six ranked options
- Gives each product a badge (Best overall / Best value / Top rated) and pros and cons grounded in price, rating, review and discount data
- Handles follow-ups ("anything cheaper?", "which has better battery?") with a LangGraph tool-calling agent that remembers the conversation
- Compares 2–4 products: a spec table with per-row winners and an AI verdict tuned to your use case
- Wishlist (guest or account), price-drop alerts with price history, accounts with saved chats, and light/dark themes on desktop and phone

**How we built it**
- **Frontend:** React 19, Vite, Tailwind CSS 4, streaming answers over Server-Sent Events
- **Backend:** FastAPI, LangGraph agent with a product-search tool, Google Gemini (text and vision)
- **Data:** SerpAPI Google Shopping for live prices. Without it, the app falls back to Gemini suggestions with clearly labelled estimates, then to a demo catalog, so it always runs
- **Storage and auth:** MongoDB (with an in-memory fallback), JWT and bcrypt
- **Quality:** 10 end-to-end API tests and GitHub Actions CI. Deployed on Vercel and Render

**Challenges**
- Keeping answers honest: the model must never invent prices or links, so estimates are labelled and badges come from real data
- Making a two-model comparison fair: results from both searches are interleaved so one brand doesn't crowd out the other
- Streaming the agent's tokens while filtering out the internal LLM calls made inside tools

**What we learned**
Tool-calling agents are powerful but need guardrails: routing simple queries to a fast single-call path cut latency, and saving conversation memory in the database made follow-ups reliable.

**What's next**
Scheduled price checks with email alerts, price-history charts across stores, and a browser extension that answers "is this a good deal?" on any product page.

**Built with:** react, vite, tailwindcss, fastapi, python, langgraph, langchain, gemini, serpapi, mongodb, vercel, render

---

## Screenshot captions

| File | Caption |
|---|---|
| `01-home-light.png` | Ask in plain words, with a budget, by voice or with a photo |
| `03-home-dark.png` | Dark mode |
| `04-home-mobile.png` | Works on phones |
| `05-assistant-search.png` | One clear pick and ranked options with honest pros and cons |
| `06-compare.png` | Side-by-side compare with per-row winners and a verdict |
| `07-agent-compare.png` | Agent follow-up: iPhone 15 vs Galaxy S24 |
