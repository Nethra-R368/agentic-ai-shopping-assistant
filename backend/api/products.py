from fastapi import APIRouter, Depends, HTTPException
from typing import List
from models.schemas import ProductSchema
from database.mongodb import get_database

router = APIRouter()

@router.get("/", response_model=List[ProductSchema])
async def get_all_products(db=Depends(get_database), limit: int = 10):
    """Fetch a list of products from MongoDB."""
    try:
        products_cursor = db.products.find().limit(limit)
        products = await products_cursor.to_list(length=limit)
        # Convert _id to string or remove it if not needed in response
        return [ProductSchema(**p) for p in products]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}/reviews")
async def get_product_reviews(product_id: str, db=Depends(get_database)):
    """Fetch reviews for a specific product."""
    try:
        reviews_cursor = db.reviews.find({"product_id": product_id})
        reviews = await reviews_cursor.to_list(length=50)
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
