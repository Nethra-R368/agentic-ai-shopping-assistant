"""Smoke-test the live chat API with many query types. Usage: python smoke.py [api_url]"""
import json
import sys
import time
import urllib.request
import uuid

API = sys.argv[1] if len(sys.argv) > 1 else "https://ecommerce-ai-backend-ks4r.onrender.com"

# (session tag, message) — same tag = same conversation, to test follow-ups.
CASES = [
    ("a", "Best laptop for coding under ₹70,000"),
    ("a", "anything cheaper?"),
    ("a", "which one has the best battery?"),
    ("b", "iPhone 15 or Galaxy S24 — which should I buy?"),
    ("c", "noise cancelling headphones under 15k"),
    ("d", "a gift for my mom who likes gardening"),
    ("e", "cotton kurta for diwali under 2000"),
    ("f", "best air fryer for a family of four"),
    ("g", "running shoes for flat feet"),
    ("h", "hi"),
    ("i", "asdfghjkl"),
    ("j", "what is OLED?"),
    ("k", "sunscreen for oily skin"),
    ("l", "ergonomic office chair under ₹12,000"),
]


def run(message, session):
    req = urllib.request.Request(
        f"{API}/api/chat/stream",
        data=json.dumps({"message": message, "session_id": session}).encode(),
        headers={"Content-Type": "application/json", "Origin": "https://agentic-ai-shopping-assistant.vercel.app"},
        method="POST",
    )
    t0 = time.time()
    ev, text, products, route, err = None, "", [], None, None
    with urllib.request.urlopen(req, timeout=150) as r:
        for raw in r:
            line = raw.decode("utf-8").strip()
            if line.startswith("event:"):
                ev = line[6:].strip()
            elif line.startswith("data:"):
                d = json.loads(line[5:])
                if ev == "token":
                    text += d["text"]
                elif ev == "products":
                    products = d["products"]
                elif ev == "done":
                    route = d["route"]
                elif ev == "error":
                    err = d["detail"]
    return time.time() - t0, route, products, text, err


ONLY = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None  # e.g. "a" to run one conversation
CASES = [c for c in CASES if not ONLY or c[0] in ONLY]

sessions = {}
fails = 0
for tag, msg in CASES:
    sid = sessions.setdefault(tag, f"smoke-{uuid.uuid4().hex[:8]}")
    try:
        dt, route, products, text, err = run(msg, sid)
    except Exception as e:  # network / timeout
        dt, route, products, text, err = 0, None, [], "", repr(e)
    within = ""
    ok = bool(text.strip()) and not err
    fails += not ok
    names = "; ".join(f"{p['name'][:28]} ₹{p['price']:,.0f}" for p in products[:3])
    print(f"{'OK ' if ok else 'FAIL'} {dt:5.1f}s {route or '-':9} {len(products)}p | {msg}")
    print(f"      {names}")
    print(f"      {text.strip()[:220].replace(chr(10), ' ')}{within}")
    if err:
        print(f"      ERROR: {err}")
print(f"\n{len(CASES) - fails}/{len(CASES)} passed")
