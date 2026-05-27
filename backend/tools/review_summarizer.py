from langchain_core.tools import tool
import asyncio
from database.mongodb import get_database

@tool
async def review_summarizer(product_name: str) -> str:
    """
    Fetch and summarize reviews for a specific product.
    Use this tool when a user asks for pros and cons, or asks what people think about a product.
    """
    from core.logger import logger
    logger.info(f"Executing tool: review_summarizer for product '{product_name}'")
    db = get_database()
    
    # 1. Find product ID
    cursor_p = db.products.find({"name": {"$regex": product_name, "$options": "i"}})
    products = await cursor_p.to_list(length=1)
    if not products:
        logger.warning(f"review_summarizer: Could not find product '{product_name}'")
        return f"Could not find a product matching '{product_name}' to get reviews for."
        
    product = products[0]
    
    # 2. Fetch reviews
    cursor_r = db.reviews.find({"product_id": str(product['_id'])})
    reviews = await cursor_r.to_list(length=10)
    
    if not reviews:
        logger.info(f"review_summarizer: No reviews found for product '{product['name']}'")
        return f"Found '{product['name']}', but it currently has no reviews."
        
    result = f"Reviews for {product['name']}:\n"
    for r in reviews:
        result += f"- Rating: {r.get('rating')}/5. Pros: {', '.join(r.get('pros', []))}. Cons: {', '.join(r.get('cons', []))}. Text: {r.get('review_text')}\n"
        
    logger.info(f"review_summarizer: Successfully fetched and summarized {len(reviews)} reviews")
    return result
