"""Per-product reasoning (why / pros / cons / badge), the chat summary, and comparisons.

With Gemini: one structured LLM call grounded in the retrieved product data.
Without Gemini: deterministic insights derived only from the real data fields
(price, rating, reviews, discount) so nothing shown is made up.
"""
import json
from statistics import median
from typing import Optional

from core.logger import logger
from models.schemas import CompareResponse, CompareRow, Product, ProductInsight
from services.llm import get_llm, parse_json, text_of


def inr(value: float) -> str:
    return f"₹{value:,.0f}" if value else "—"


# ---------------------------------------------------------------- rule-based
def _value_score(p: Product, med_price: float) -> float:
    rating = p.rating or 3.5
    price_factor = (med_price / p.price) if p.price and med_price else 1
    return rating * (price_factor ** 0.5)


def rule_based_insights(products: list[Product]) -> list[Product]:
    if not products:
        return products
    prices = [p.price for p in products if p.price > 0]
    med = median(prices) if prices else 0
    cheapest = min(products, key=lambda p: p.price or float("inf"))
    rated = [p for p in products if p.rating]
    best_rated = max(rated, key=lambda p: (p.rating, p.reviews_count or 0)) if rated else None
    best_value = max(products, key=lambda p: _value_score(p, med))

    out = []
    for p in products:
        pros, cons = [], []
        if p.rating and p.rating >= 4.5:
            pros.append(f"Highly rated ({p.rating}/5)")
        elif p.rating and p.rating < 3.8:
            cons.append(f"Mixed ratings ({p.rating}/5)")
        if p.reviews_count and p.reviews_count >= 500:
            pros.append(f"Proven pick — {p.reviews_count:,} reviews")
        if p.original_price and p.original_price > p.price:
            pct = round((1 - p.price / p.original_price) * 100)
            pros.append(f"{pct}% off the usual {inr(p.original_price)}")
        if med and p.price:
            diff = (p.price - med) / med
            if diff <= -0.2:
                pros.append(f"{round(-diff * 100)}% below the typical price here")
            elif diff >= 0.25:
                cons.append(f"{round(diff * 100)}% pricier than similar options")
        if not p.rating:
            cons.append("No rating data yet")
        if p.provider == "ai":
            cons.append("Estimated price — confirm at the store")
        if not pros:
            pros.append("Matches your search")

        badge = None
        if p is best_value and len(products) > 1:
            badge = "Best value"
        if best_rated is not None and p is best_rated:
            badge = "Top rated" if badge is None else "Best overall"
        if p is cheapest and badge is None and len(products) > 1:
            badge = "Lowest price"

        why = p.description.split(". ")[0][:180] if p.description else f"Sold by {p.seller or 'a trusted store'}."
        out.append(p.model_copy(update={"insight": ProductInsight(why=why, pros=pros[:3], cons=cons[:2], badge=badge)}))
    return out


def rule_based_summary(query: str, products: list[Product], provider: str) -> str:
    if not products:
        return ("I couldn't find good matches for that. Try naming the product type, "
                "a brand, or a budget — e.g. *\"wireless earbuds under ₹3,000\"*.")
    prices = [p.price for p in products if p.price]
    rng = f" between **{inr(min(prices))}** and **{inr(max(prices))}**" if prices else ""
    top = next((p for p in products if p.insight and p.insight.badge in {"Best overall", "Best value"}), products[0])
    if len(products) == 1:
        rng = f" at **{inr(products[0].price)}**" if products[0].price else ""
        lines = [f"I found **1 strong match** for *{query}*{rng}: **{top.name}**."]
    else:
        lines = [f"I found **{len(products)} options** for *{query}*{rng}.",
                 f"My pick: **{top.name}** — {top.insight.badge.lower() if top.insight and top.insight.badge else 'a strong match'}."]
    if provider == "ai":
        lines.append("\n> Prices are AI estimates — tap a product to compare live store prices.")
    return " ".join(lines[:2]) + "".join(lines[2:])


# ---------------------------------------------------------------- LLM
def _product_brief(products: list[Product]) -> str:
    return json.dumps([
        {"index": i, "name": p.name, "price_inr": p.price, "original_price_inr": p.original_price,
         "rating": p.rating, "reviews": p.reviews_count, "seller": p.seller,
         "description": p.description[:300], "specs": p.specifications}
        for i, p in enumerate(products)
    ], ensure_ascii=False)


async def enrich(query: str, products: list[Product], provider: str, history: str = "") -> tuple[str, list[Product]]:
    """Return (summary_markdown, products_with_insights)."""
    llm = get_llm(0.3)
    if llm is None or not products:
        enriched = rule_based_insights(products)
        return rule_based_summary(query, enriched, provider), enriched

    prompt = f"""You are AuraBuy, a sharp, honest shopping concierge for Indian shoppers.
{f"Conversation so far:{chr(10)}{history}{chr(10)}" if history else ""}
User request: "{query}"
Products found (JSON): {_product_brief(products)}

Using ONLY the data above (never invent specs, prices or reviews), return JSON:
{{
  "summary": "2-4 sentence markdown answer: name your top pick in **bold** and say why, mention the price range in ₹, and one trade-off to consider.",
  "items": [{{"index": 0, "why": "one sentence on fit for THIS request", "pros": ["max 3 short"], "cons": ["max 2 short, honest"],
              "badge": "Best overall | Best value | Budget pick | Top rated | Premium pick | null"}}]
}}
Give each badge to at most one product."""
    try:
        reply = await llm.ainvoke(prompt)
        data = parse_json(text_of(reply.content))
        by_index = {int(it["index"]): it for it in data.get("items", []) if "index" in it}
        enriched = []
        for i, p in enumerate(products):
            it = by_index.get(i, {})
            badge = it.get("badge")
            enriched.append(p.model_copy(update={"insight": ProductInsight(
                why=it.get("why", ""), pros=it.get("pros", [])[:3], cons=it.get("cons", [])[:2],
                badge=badge if badge and badge != "null" else None)}))
        summary = data.get("summary") or rule_based_summary(query, enriched, provider)
        if provider == "ai":
            summary += "\n\n> Prices are AI estimates — tap **Compare prices** to see live store listings."
        return summary, enriched
    except Exception as e:
        logger.warning(f"LLM enrichment failed, using rule-based insights: {e}")
        enriched = rule_based_insights(products)
        return rule_based_summary(query, enriched, provider), enriched


# ---------------------------------------------------------------- compare
def _compare_rows(products: list[Product]) -> list[CompareRow]:
    def winner(values, best):
        """Index of the strictly best value, or None on ties / too little data."""
        valid = [(i, v) for i, v in enumerate(values) if v]
        if len(valid) < 2:
            return None
        top = best(v for _, v in valid)
        leaders = [i for i, v in valid if v == top]
        return leaders[0] if len(leaders) == 1 else None

    rows = [
        CompareRow(label="Price", values=[inr(p.price) for p in products],
                   winner=winner([p.price for p in products], min)),
        CompareRow(label="Rating", values=[f"{p.rating}/5" if p.rating else "—" for p in products],
                   winner=winner([p.rating for p in products], max)),
        CompareRow(label="Reviews", values=[f"{p.reviews_count:,}" if p.reviews_count else "—" for p in products],
                   winner=winner([p.reviews_count for p in products], max)),
        CompareRow(label="Seller", values=[p.seller or "—" for p in products]),
        CompareRow(label="Brand", values=[p.brand or "—" for p in products]),
    ]
    spec_keys = []
    taken = {r.label.lower() for r in rows}
    for p in products:
        for k in p.specifications:
            if k not in spec_keys and k.lower() not in taken and not k.startswith("Note"):
                spec_keys.append(k)
    for k in spec_keys[:8]:
        rows.append(CompareRow(label=k, values=[str(p.specifications.get(k, "—")) for p in products]))
    return [r for r in rows if any(v != "—" for v in r.values)]


async def compare(products: list[Product], use_case: Optional[str] = None) -> CompareResponse:
    rows = _compare_rows(products)
    llm = get_llm(0.2)
    if llm is not None:
        prompt = f"""Compare these products for an Indian shopper{f' whose use case is: "{use_case}"' if use_case else ''}.
Data (JSON, prices in INR): {_product_brief(products)}
Using only this data plus well-known facts about these exact models, return JSON:
{{"verdict": "3-5 sentence markdown verdict naming the winner in **bold**, who should pick each alternative instead",
  "winner_index": <int>,
  "rows": [{{"label": "e.g. Battery life / Display / Build", "values": ["one short value per product, same order"], "winner": <index or null>}}]}}
Give 3-5 extra rows on the dimensions that matter most for this product type."""
        try:
            data = parse_json(text_of((await llm.ainvoke(prompt)).content))
            extra = [CompareRow(**r) for r in data.get("rows", []) if len(r.get("values", [])) == len(products)]
            return CompareResponse(verdict=data.get("verdict", ""), winner_index=data.get("winner_index"),
                                   rows=rows + extra, ai=True)
        except Exception as e:
            logger.warning(f"LLM compare failed, using rule-based: {e}")

    prices = [p.price for p in products if p.price]
    med = median(prices) if prices else 0
    scores = [_value_score(p, med) for p in products]
    w = max(range(len(products)), key=lambda i: scores[i])
    cheapest = min(range(len(products)), key=lambda i: products[i].price or float("inf"))
    verdict = f"**{products[w].name}** offers the best balance of rating and price."
    if cheapest != w:
        verdict += f" If budget matters most, **{products[cheapest].name}** is the cheapest at {inr(products[cheapest].price)}."
    return CompareResponse(verdict=verdict, winner_index=w, rows=rows, ai=False)
