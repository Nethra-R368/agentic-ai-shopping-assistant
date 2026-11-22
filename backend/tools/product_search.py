import json
from typing import Optional

from langchain_core.tools import tool

from services.search import search_products

PRODUCTS_START = "PRODUCTS_JSON_START"
PRODUCTS_END = "PRODUCTS_JSON_END"


@tool
async def product_search(query: str, budget_inr: Optional[float] = None) -> str:
    """Search online stores for products. `query` should be a concise shopping query
    (e.g. "noise cancelling headphones", "iPhone 15 128GB"); `budget_inr` is an optional max price in rupees.
    Call once per distinct product you need (e.g. twice to compare two models)."""
    products, provider = await search_products(query, budget=budget_inr, limit=4)
    if not products:
        return "No products found for that query."
    payload = json.dumps([p.model_dump() for p in products], ensure_ascii=False)
    lines = [f"- [{i}] {p.name} | ₹{p.price:,.0f} | rating {p.rating or 'n/a'} | {p.seller} | specs {json.dumps(p.specifications, ensure_ascii=False)}"
             for i, p in enumerate(products)]
    return f"{PRODUCTS_START}{payload}{PRODUCTS_END}\nSource: {provider}\n" + "\n".join(lines)


def extract_products(tool_output: str) -> list[dict]:
    if PRODUCTS_START not in tool_output:
        return []
    raw = tool_output.split(PRODUCTS_START, 1)[1].split(PRODUCTS_END, 1)[0]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []
