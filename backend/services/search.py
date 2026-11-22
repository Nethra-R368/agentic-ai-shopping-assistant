"""Product discovery.

Provider cascade:
  1. MongoDB query cache (TTL)
  2. SerpAPI Google Shopping  -> real listings, prices, images, store links   (SERPAPI_API_KEY)
  3. Gemini suggestions       -> real model names + est. price, links to a Google Shopping search (GEMINI_API_KEY)
  4. Demo catalog (DummyJSON) -> so the site works with no keys at all
"""
import hashlib
import re
import time
from typing import Optional
from urllib.parse import quote_plus

import httpx

from core.config import settings
from core.logger import logger
from database.mongodb import get_database
from models.schemas import Product
from services.llm import get_llm, parse_json, text_of

USD_TO_INR = 85.0

STOPWORDS = {
    "a", "an", "the", "me", "my", "i", "for", "with", "and", "or", "of", "to", "in", "on", "that", "is",
    "best", "top", "good", "great", "cheap", "cheapest", "affordable", "find", "show", "suggest", "recommend",
    "need", "want", "looking", "buy", "some", "any", "please", "can", "you", "get", "under", "below", "budget",
    "rs", "inr", "price", "around", "within", "upto", "up", "less", "than", "max", "options", "option",
}

BUDGET_RE = re.compile(
    r"(?:under|below|less than|within|up ?to|max(?:imum)?|budget(?: of)?|<|around)\s*"
    r"(?:₹|rs\.?|inr|\$)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l)?\b",
    re.I,
)


def parse_budget(text: str) -> Optional[float]:
    m = BUDGET_RE.search(text or "")
    if not m:
        return None
    value = float(m.group(1).replace(",", ""))
    unit = (m.group(2) or "").lower()
    if unit in {"k", "thousand"}:
        value *= 1_000
    elif unit.startswith("l"):
        value *= 100_000
    return value or None


def clean_query(text: str) -> str:
    """Turn 'Best AI laptop under ₹1 lakh for coding' into 'ai laptop coding'."""
    text = BUDGET_RE.sub(" ", text or "")
    words = re.findall(r"[a-zA-Z0-9][a-zA-Z0-9+\-']*", text.lower())
    kept = [w for w in words if w not in STOPWORDS]
    return " ".join(kept) or (text or "").strip()


def product_key(name: str, seller: Optional[str] = "") -> str:
    raw = f"{(name or '').strip().lower()}|{(seller or '').strip().lower()}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


def shopping_link(name: str) -> str:
    return f"https://www.google.com/search?tbm=shop&q={quote_plus(name)}"


def parse_price(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    digits = re.sub(r"[^\d.]", "", str(value or ""))
    try:
        return float(digits) if digits else 0.0
    except ValueError:
        return 0.0


# ---------------------------------------------------------------- providers
async def _from_serpapi(query: str, limit: int) -> list[Product]:
    params = {
        "engine": "google_shopping",
        "q": query,
        "gl": settings.SEARCH_COUNTRY,
        "hl": "en",
        "api_key": settings.SERPAPI_API_KEY,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get("https://serpapi.com/search.json", params=params)
        r.raise_for_status()
        results = r.json().get("shopping_results", [])

    products = []
    for item in results[: limit * 2]:
        name = item.get("title")
        if not name:
            continue
        seller = item.get("source") or "Online store"
        price = item.get("extracted_price") or parse_price(item.get("price"))
        old = item.get("extracted_old_price")
        specs = {}
        if item.get("delivery"):
            specs["Delivery"] = item["delivery"]
        for ext in (item.get("extensions") or [])[:3]:
            specs[f"Note {len(specs) + 1}"] = ext
        products.append(
            Product(
                id=product_key(name, seller),
                name=name,
                brand=None,
                category=None,
                description=item.get("snippet") or "",
                price=float(price or 0),
                original_price=float(old) if old else None,
                currency=settings.CURRENCY,
                rating=float(item["rating"]) if item.get("rating") else None,
                reviews_count=int(item["reviews"]) if item.get("reviews") else None,
                image_url=item.get("thumbnail"),
                product_url=item.get("product_link") or item.get("link") or shopping_link(name),
                seller=seller,
                provider="serpapi",
                specifications=specs,
            )
        )
    return products[:limit]


async def _from_gemini(query: str, budget: Optional[float], limit: int) -> list[Product]:
    llm = get_llm(0.3)
    if llm is None:
        return []
    prompt = f"""You are a shopping expert for the Indian market (prices in INR).
User request: "{query}"
Budget: {f"₹{budget:,.0f}" if budget else "not specified"}

List {limit} real, currently sold product models that best fit. Do NOT invent products or URLs.
Return ONLY a JSON array of objects with keys:
  "name" (exact model name), "brand", "category",
  "price" (typical INR street price as a number),
  "rating" (typical rating out of 5, number),
  "description" (one sentence on why it fits this request),
  "specifications" (object with 3-4 key specs, short values)."""
    reply = await llm.ainvoke(prompt)
    data = parse_json(text_of(reply.content))
    products = []
    for item in data[:limit]:
        name = item.get("name")
        if not name:
            continue
        products.append(
            Product(
                id=product_key(name, "ai"),
                name=name,
                brand=item.get("brand"),
                category=item.get("category"),
                description=item.get("description", ""),
                price=parse_price(item.get("price")),
                rating=float(item["rating"]) if item.get("rating") else None,
                currency=settings.CURRENCY,
                product_url=shopping_link(name),
                seller="Compare stores",
                provider="ai",
                specifications={str(k): str(v) for k, v in (item.get("specifications") or {}).items()},
            )
        )
    return products


def _demo_product(p: dict) -> Product:
    price = round(p.get("price", 0) * USD_TO_INR / 10) * 10
    disc = p.get("discountPercentage") or 0
    specs = {}
    for k in ("brand", "warrantyInformation", "shippingInformation", "returnPolicy"):
        if p.get(k):
            specs[{"brand": "Brand", "warrantyInformation": "Warranty",
                   "shippingInformation": "Shipping", "returnPolicy": "Returns"}[k]] = p[k]
    return Product(
        id=product_key(p.get("title", ""), "demo"),
        name=p.get("title", "Product"),
        brand=p.get("brand"),
        category=(p.get("category") or "").replace("-", " ").title() or None,
        description=p.get("description", ""),
        price=float(price),
        original_price=float(round(price / (1 - disc / 100) / 10) * 10) if disc >= 5 else None,
        currency=settings.CURRENCY,
        rating=round(float(p.get("rating", 0)), 1) or None,
        reviews_count=len(p.get("reviews") or []) or None,
        image_url=p.get("thumbnail"),
        product_url=shopping_link(p.get("title", "")),
        seller="Demo catalog",
        provider="demo",
        specifications=specs,
    )


# keyword -> DummyJSON categories (demo mode only)
DEMO_CATEGORIES = {
    ("laptop", "notebook", "macbook"): ["laptops"],
    ("phone", "smartphone", "mobile", "iphone", "android"): ["smartphones"],
    ("tablet", "ipad"): ["tablets"],
    ("headphone", "headphones", "earbuds", "earphones", "airpods", "speaker", "charger", "accessories"): ["mobile-accessories"],
    ("perfume", "fragrance", "cologne", "scent", "deodorant"): ["fragrances"],
    ("makeup", "lipstick", "mascara", "beauty", "cosmetics"): ["beauty"],
    ("skincare", "moisturizer", "serum", "lotion", "sunscreen"): ["skin-care"],
    ("decor", "lamp", "vase", "candle", "frame", "plant"): ["home-decoration"],
    ("furniture", "sofa", "chair", "table", "bed", "desk"): ["furniture"],
    ("kitchen", "cookware", "pan", "knife", "mug"): ["kitchen-accessories"],
    ("watch", "watches", "smartwatch"): ["mens-watches", "womens-watches"],
    ("shoe", "shoes", "sneaker", "sneakers", "footwear", "heels"): ["mens-shoes", "womens-shoes"],
    ("shirt", "tshirt", "t-shirt"): ["mens-shirts"],
    ("dress", "dresses", "gown"): ["womens-dresses"],
    ("top", "tops", "blouse"): ["tops"],
    ("bag", "bags", "handbag", "purse", "backpack"): ["womens-bags"],
    ("jewelry", "jewellery", "necklace", "earring", "earrings", "ring", "bracelet"): ["womens-jewellery"],
    ("sunglasses", "shades", "glasses"): ["sunglasses"],
    ("sports", "gym", "fitness", "football", "cricket", "tennis", "ball"): ["sports-accessories"],
}
GENDER_WORDS = {"men", "mens", "man", "male", "him", "boys", "women", "womens", "woman", "female", "her", "girls", "ladies"}


async def _from_demo(query: str, limit: int) -> list[Product]:
    terms = clean_query(query)
    words = set(terms.split())
    wants_women = bool(words & {"women", "womens", "woman", "female", "her", "girls", "ladies"})
    wants_men = bool(words & {"men", "mens", "man", "male", "him", "boys"})
    found: list[dict] = []
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. full-text search on the cleaned query
        r = await client.get("https://dummyjson.com/products/search", params={"q": terms, "limit": 30})
        if r.status_code == 200:
            found = r.json().get("products", [])
        # 2. category match on keywords
        if len(found) < 2:
            for keys, cats in DEMO_CATEGORIES.items():
                if words & set(keys):
                    if wants_men:
                        cats = [c for c in cats if not c.startswith("womens")] or cats
                    elif wants_women:
                        cats = [c for c in cats if not c.startswith("mens")] or cats
                    for cat in cats:
                        r = await client.get(f"https://dummyjson.com/products/category/{cat}", params={"limit": 30})
                        if r.status_code == 200:
                            found += r.json().get("products", [])
                    break
        # 3. single meaningful keywords
        if not found:
            for w in sorted(words - GENDER_WORDS, key=len, reverse=True):
                if len(w) < 4:
                    continue
                r = await client.get("https://dummyjson.com/products/search", params={"q": w.rstrip("s"), "limit": 30})
                if r.status_code == 200 and r.json().get("products"):
                    found = r.json()["products"]
                    break
    found.sort(key=lambda p: -p.get("rating", 0))
    return [_demo_product(p) for p in found[: limit * 2]]


async def trending(limit: int = 8) -> list[Product]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            "https://dummyjson.com/products",
            params={"limit": 60, "select": "title,price,rating,thumbnail,category,brand,description,discountPercentage"},
        )
        r.raise_for_status()
    items = [p for p in r.json().get("products", []) if p.get("category") not in {"groceries"}]
    items.sort(key=lambda p: -p.get("rating", 0))
    return [_demo_product(p) for p in items[:limit]]


# ---------------------------------------------------------------- main entry
async def search_products(query: str, budget: Optional[float] = None, limit: int = 6) -> tuple[list[Product], str]:
    """Return (products, provider). Never raises for provider failures."""
    budget = budget or parse_budget(query)
    cache_key = f"{settings.SEARCH_COUNTRY}:{query.strip().lower()}:{budget or ''}"
    db = get_database()

    cached = await db.query_cache.find_one({"_id": cache_key})
    if cached and time.time() - cached.get("ts", 0) < settings.QUERY_CACHE_TTL_SECONDS:
        logger.info(f"search cache hit: {query!r}")
        return [Product(**p) for p in cached["products"]], cached["provider"]

    products: list[Product] = []
    provider = "none"
    t0 = time.time()

    if settings.has_serpapi:
        try:
            products, provider = await _from_serpapi(clean_query(query), limit * 2), "serpapi"
        except Exception as e:
            logger.warning(f"SerpAPI failed: {e}")
    if not products and settings.has_gemini:
        try:
            products, provider = await _from_gemini(query, budget, limit), "ai"
        except Exception as e:
            logger.warning(f"Gemini suggestion failed: {e}")
    if not products:
        try:
            products, provider = await _from_demo(query, limit), "demo"
        except Exception as e:
            logger.warning(f"Demo catalog failed: {e}")

    if budget and products:
        within = [p for p in products if 0 < p.price <= budget * 1.05]
        if within:
            products = within
    products = products[:limit]
    logger.info(f"search {query!r} -> {len(products)} via {provider} in {time.time() - t0:.2f}s")

    if products:
        await db.query_cache.replace_one(
            {"_id": cache_key},
            {"_id": cache_key, "ts": time.time(), "provider": provider, "products": [p.model_dump() for p in products]},
            upsert=True,
        )
    return products, provider


async def refresh_price(product: Product) -> Optional[float]:
    """Look up the current price for a saved product (used by price alerts)."""
    if product.provider == "serpapi" and settings.has_serpapi:
        try:
            results = await _from_serpapi(product.name, 10)
            same = [p for p in results if p.id == product.id] or [
                p for p in results if (p.seller or "") == (product.seller or "")
            ]
            if same:
                return same[0].price
            if results:
                return min(p.price for p in results if p.price > 0)
        except Exception as e:
            logger.warning(f"price refresh failed for {product.name}: {e}")
        return None
    # AI estimates and demo items have no live feed; keep the saved price.
    return product.price
