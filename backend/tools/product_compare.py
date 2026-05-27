from langchain_core.tools import tool
import httpx
from database.mongodb import get_database

async def fetch_all_from_api():
    url = "https://fakestoreapi.com/products"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

@tool
async def product_compare(product_a_name: str, product_b_name: str) -> str:
    """
    Compare two products by their names. 
    Use this tool when a user explicitly asks to compare two different products or brands.
    """
    from core.logger import logger
    logger.info(f"Executing tool: product_compare for '{product_a_name}' vs '{product_b_name}'")
    
    db = get_database()
    
    pa, pb = None, None
    try:
        api_data = await fetch_all_from_api()
        # Find product A
        for item in api_data:
            if product_a_name.lower() in item['title'].lower():
                pa = item
                break
        
        # Find product B
        for item in api_data:
            if product_b_name.lower() in item['title'].lower():
                pb = item
                break
    except Exception as e:
        logger.error(f"FakeStoreAPI failed in compare: {e}. Falling back to cache.")
        
        cursor_a = db.cached_products.find({"name": {"$regex": product_a_name, "$options": "i"}})
        cursor_b = db.cached_products.find({"name": {"$regex": product_b_name, "$options": "i"}})
        
        prod_a = await cursor_a.to_list(length=1)
        prod_b = await cursor_b.to_list(length=1)
        
        if prod_a: pa = prod_a[0]
        if prod_b: pb = prod_b[0]
        
    if not pa or not pb:
        logger.warning(f"product_compare: Could not find both products. A: {bool(pa)}, B: {bool(pb)}")
        return f"Could not find both products to compare. Found A: {bool(pa)}, Found B: {bool(pb)}"
    
    # Map fields for consistency
    name_a = pa.get('title', pa.get('name'))
    price_a = pa.get('price')
    # Depending on whether data is from API or MongoDB cache, rating structure might differ slightly
    rating_a_obj = pa.get('rating')
    rating_a = rating_a_obj.get('rate') if isinstance(rating_a_obj, dict) else rating_a_obj
    
    name_b = pb.get('title', pb.get('name'))
    price_b = pb.get('price')
    rating_b_obj = pb.get('rating')
    rating_b = rating_b_obj.get('rate') if isinstance(rating_b_obj, dict) else rating_b_obj
    
    result = f"Comparison between {name_a} and {name_b}:\n"
    result += f"- Price: ${price_a} vs ${price_b}\n"
    result += f"- Rating: {rating_a} vs {rating_b}\n"
    result += f"- Category: {pa.get('category')} vs {pb.get('category')}\n"
    
    logger.info(f"product_compare: Successfully compared '{name_a}' and '{name_b}'")
    return result
