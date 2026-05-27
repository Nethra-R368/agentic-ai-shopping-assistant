from langchain_core.tools import tool
import httpx
from database.mongodb import get_database

async def fetch_from_api(category: str = None):
    url = "https://fakestoreapi.com/products"
    if category:
        # FakeStoreAPI requires lowercase for categories
        url = f"https://fakestoreapi.com/products/category/{category.lower()}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

@tool
async def product_search(query: str, budget: float = None, category: str = None) -> str:
    """
    Search for products based on a natural language query, an optional budget, and an optional category.
    Always use this tool when the user is looking for a product or asking for recommendations.
    Valid categories: "electronics", "jewelery", "men's clothing", "women's clothing".
    """
    from core.logger import logger
    logger.info(f"Executing tool: product_search for query '{query}' (budget: {budget}, category: {category})")
    
    db = get_database()
    products_data = []
    source = "FakeStoreAPI"

    try:
        api_data = await fetch_from_api(category)
        
        # Format the data
        for item in api_data:
            product = {
                "id": str(item.get("id")),
                "name": item.get("title"),
                "price": float(item.get("price", 0)),
                "description": item.get("description"),
                "category": item.get("category"),
                "image_url": item.get("image"),
                "rating": item.get("rating", {}).get("rate", 0),
                "rating_count": item.get("rating", {}).get("count", 0)
            }
            products_data.append(product)
            
        # Asynchronously cache in MongoDB
        if products_data:
            try:
                for p in products_data:
                    await db.cached_products.update_one(
                        {"id": p["id"]}, {"$set": p}, upsert=True
                    )
            except Exception as e:
                logger.error(f"Failed to cache products: {e}")

    except Exception as e:
        logger.error(f"FakeStoreAPI failed: {e}. Falling back to MongoDB cache.")
        source = "MongoDB Cache"
        # Fallback to MongoDB cache
        query_filter = {}
        if category:
            query_filter["category"] = category
        cursor = db.cached_products.find(query_filter)
        products_data = await cursor.to_list(length=100)
        
        if not products_data:
            return "No products found in live API or cache."

    # Filter by budget
    if budget:
        products_data = [p for p in products_data if p["price"] <= budget]

    # Filter by text query matching name or description simply
    if query and query.lower() not in ["all", "everything", "any"]:
        query_terms = query.lower().split()
        filtered_products = []
        for p in products_data:
            text_to_search = (p["name"] + " " + p["description"]).lower()
            if any(term in text_to_search for term in query_terms):
                filtered_products.append(p)
        if filtered_products:
            products_data = filtered_products

    products_data = products_data[:5]
    
    if not products_data:
        return "No products found matching your criteria."

    # Format context for LLM
    context = f"Retrieved Context (Source: {source}):\n\n"
    for p in products_data:
        context += f"- Product ID: {p.get('id')}\n"
        context += f"  Name: {p.get('name')}\n"
        context += f"  Price: ${p.get('price')}\n"
        context += f"  Category: {p.get('category')}\n"
        context += f"  Description: {p.get('description')}\n"
        context += f"  Rating: {p.get('rating')}\n"
        context += f"  Image URL: {p.get('image_url')}\n"
        context += "\n"
        
    logger.info(f"product_search: Successfully retrieved context with {len(products_data)} items")
    return context
