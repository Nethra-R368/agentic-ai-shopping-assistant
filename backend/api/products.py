import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import chat_limiter
from core.logger import logger
from database.mongodb import get_database
from models.schemas import CompareRequest, CompareResponse, Product
from services import insights, search

router = APIRouter()

_trending_cache: dict = {"ts": 0, "items": []}


@router.get("/search")
async def search_products(q: str = Query(..., min_length=1, max_length=200), budget: Optional[float] = None,
                          _=Depends(chat_limiter)):
    products, provider = await search.search_products(q, budget=budget, limit=8)
    return {"query": q, "provider": provider, "products": insights.rule_based_insights(products)}


@router.get("/trending", response_model=List[Product])
async def trending():
    if time.time() - _trending_cache["ts"] < 3600 and _trending_cache["items"]:
        return _trending_cache["items"]
    try:
        items = insights.rule_based_insights(await search.trending(8))
        _trending_cache.update(ts=time.time(), items=items)
        return items
    except Exception as e:
        logger.warning(f"trending failed: {e}")
        return _trending_cache["items"]


@router.post("/compare", response_model=CompareResponse)
async def compare_products(body: CompareRequest, _=Depends(chat_limiter)):
    try:
        return await insights.compare(body.products, body.use_case)
    except Exception as e:
        logger.error(f"compare failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Comparison failed. Please try again.")


@router.get("/popular-searches", response_model=List[str])
async def popular_searches():
    """Most frequent recent queries (from the query cache)."""
    docs = await get_database().query_cache.find({}, {"_id": 1}).sort("ts", -1).to_list(30)
    seen, out = set(), []
    for d in docs:
        q = d["_id"].split(":", 1)[-1].rsplit(":", 1)[0]
        if q and q not in seen:
            seen.add(q)
            out.append(q)
    return out[:8]
