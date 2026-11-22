import time
from typing import List

from fastapi import APIRouter, Depends

from api.deps import get_current_user
from database.mongodb import get_database
from models.schemas import Product, WishlistItem

router = APIRouter()


@router.get("", response_model=List[WishlistItem])
async def list_wishlist(user: dict = Depends(get_current_user)):
    docs = await get_database().wishlist.find({"user_id": user["_id"]}).sort("added_at", -1).to_list(200)
    return [WishlistItem(product=Product(**d["product"]), added_at=d["added_at"]) for d in docs]


@router.post("", response_model=WishlistItem, status_code=201)
async def add_to_wishlist(product: Product, user: dict = Depends(get_current_user)):
    now = time.time()
    await get_database().wishlist.update_one(
        {"user_id": user["_id"], "product_key": product.id},
        {"$set": {"product": product.model_dump()}, "$setOnInsert": {"added_at": now}},
        upsert=True,
    )
    return WishlistItem(product=product, added_at=now)


@router.post("/sync", response_model=List[WishlistItem])
async def sync_wishlist(products: List[Product], user: dict = Depends(get_current_user)):
    """Merge a guest's local wishlist into their account after sign-in."""
    for p in products[:100]:
        await add_to_wishlist(p, user)
    return await list_wishlist(user)


@router.delete("/{product_id}", status_code=204)
async def remove_from_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await get_database().wishlist.delete_one({"user_id": user["_id"], "product_key": product_id})
