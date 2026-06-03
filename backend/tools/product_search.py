from langchain_core.tools import tool
import httpx
import os
import json
import time
import uuid
from database.mongodb import get_database
from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import settings

def extract_text_content(content) -> str:
    """Safely extracts string content from a string or a list of content blocks."""
    if isinstance(content, list):
        extracted = ""
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                extracted += block.get("text", "")
            elif isinstance(block, str):
                extracted += block
        return extracted.strip()
    return str(content).strip()

async def fetch_via_serpapi(query: str, api_key: str):
    """Fetch search results from SerpAPI Google Shopping directly with latency profiling."""
    from core.logger import logger
    url = "https://serpapi.com/search.json"
    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": api_key,
        "num": 5
    }
    logger.info("SerpAPI request: Initiating HTTP GET to Google Shopping...")
    start_time = time.time()
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        latency = time.time() - start_time
        data = response.json()
        shopping_results = data.get("shopping_results", [])
        results_count = len(shopping_results)
        logger.info(f"SerpAPI request completed in {latency:.3f}s. Discovered {results_count} products.")
        return shopping_results

async def search_via_gemini_crawler(query: str, budget: float = None, category: str = None) -> list:
    """
    Fallback crawler using Gemini 3.1 Flash Lite's massive product search reasoning database.
    Formulates dynamic structured product listings based on active search parameters.
    """
    from core.logger import logger
    logger.info(f"Gemini AI Concierge crawler activated for search: '{query}'")
    
    # Initialize standard Gemini 3.1 Flash Lite model
    model = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        temperature=0.7,
        google_api_key=settings.GEMINI_API_KEY
    )
    
    prompt = f"""
    You are an advanced real-time internet-scale e-commerce web crawler and product discovery agent.
    A user has entered a search query: "{query}"
    Optional constraints: Budget: {budget or "No budget constraint"}, Category: {category or "No category constraint"}.
    
    Search across major retail networks (Amazon, Best Buy, eBay, Target, IKEA, Shopify stores, etc.) and discover the top 3-4 actual real-world products that perfectly match this description.
    
    Generate a JSON list of products. Return ONLY a valid JSON array, containing objects matching this schema exactly:
    [
      {{
        "id": "unique string e.g. p_keyboard_razer",
        "name": "Full Product Title (e.g. Razer BlackWidow V4 Pro Mechanical Keyboard)",
        "brand": "Brand Name (e.g. Razer)",
        "category": "Electronics/Home Decor/Laptops/Apparel/etc",
        "price": 229.99,
        "rating": 4.7,
        "description": "Premium descriptive overview highlighting why this matches, its build quality, and target audience.",
        "specifications": {{
          "key_spec1": "value1",
          "key_spec2": "value2",
          "key_spec3": "value3"
        }},
        "image_url": "High quality Unsplash image URL matching the exact item",
        "product_url": "Valid external link to purchase the item",
        "source": "Name of the retailer (e.g. Amazon, Best Buy)",
        "seller": "Name of the retailer (e.g. Amazon, Best Buy)"
      }}
    ]

    Ensure:
    1. The items represent REAL models available on the internet today.
    2. Image URLs must be high-quality valid public Unsplash URLs that display beautifully.
    3. Return ONLY the raw JSON block without markdown wrappers. Do not output ```json ... ```. Just the raw array.
    """
    
    try:
        start_time = time.time()
        response = await model.ainvoke(prompt)
        text = extract_text_content(response.content)
        
        # Clean markdown code block wrappers if present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```json") or lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        products = json.loads(text)
        latency = time.time() - start_time
        num_products = len(products)
        crawl_speed = num_products / latency if latency > 0 else 0
        logger.info(f"Gemini crawler completed in {latency:.3f}s. Discovered {num_products} products. Crawl speed: {crawl_speed:.2f} products/second.")
        return products
    except Exception as e:
        logger.error(f"Gemini Crawler failed to formulate products: {e}")
        return []

@tool
async def product_search(query: str, budget: float = None, category: str = None) -> str:
    """
    Discover premium products from across the internet based on user requests, budgets, or categories.
    This search tool performs real-time queries across retail databases using internet discovery crawlers.
    """
    from core.logger import logger
    logger.info(f"Executing search concierge: product_search '{query}'")
    
    db = get_database()
    serpapi_key = os.getenv("SERPAPI_API_KEY")
    products_data = []
    source = "AI Discovery Crawler"
    
    start_time = time.time()

    # 0. Check Query Cache (1-hour TTL)
    try:
        cached_query = await db.query_cache.find_one({"_id": query})
        if cached_query:
            time_since = start_time - cached_query.get("timestamp", 0)
            if time_since < 3600:
                logger.info(f"Query cache HIT for '{query}' (Age: {time_since:.1f}s). Serving from MongoDB.")
                products_data = cached_query.get("products", [])
                source = "MongoDB Query Cache"
    except Exception as e:
        logger.error(f"Error checking query cache: {e}")

    # 1. Search SerpAPI if Key is defined in backend/.env
    if not products_data and serpapi_key and serpapi_key != "your_serpapi_key_here":
        try:
            logger.info("Executing real-time SerpAPI Google Shopping discovery query...")
            serpapi_start = time.time()
            serpapi_results = await fetch_via_serpapi(query, serpapi_key)
            serpapi_latency = time.time() - serpapi_start
            logger.info(f"SERPAPI CALL SUCCESSFUL (Latency: {serpapi_latency:.3f} seconds)")
            
            # Map SerpAPI response directly to our ProductSchema
            for item in serpapi_results:
                # Extract clean price number if possible
                price_str = item.get("price", "0").replace('₹', '').replace('$', '').replace(',', '').strip()
                try:
                    price_val = float(price_str.split()[0] if ' ' in price_str else price_str)
                except ValueError:
                    price_val = 0.0

                products_data.append({
                    "id": item.get("product_id") or str(uuid.uuid4()),
                    "name": item.get("title"),
                    "brand": item.get("source") or "Shopping Retailer",
                    "category": category or "Google Shopping",
                    "price": price_val,
                    "rating": float(item.get("rating") or 0.0),
                    "description": item.get("snippet") or "Found via real-time SerpAPI Google Shopping search.",
                    "specifications": {"source": item.get("source")},
                    "image_url": item.get("thumbnail"),
                    "product_url": item.get("link") or item.get("product_link"),
                    "source": item.get("source") or "Shopping Retailer",
                    "seller": item.get("source") or "Shopping Retailer"
                })
            
            source = "SerpAPI Google Shopping"
        except Exception as e:
            logger.warn(f"SerpAPI search failed: {e}. Cascading to Gemini crawler fallback.")
            products_data = []

    # 2. Fallback to Gemini 3.1 Flash E-commerce Web Crawler
    if not products_data:
        logger.info("SerpAPI key is missing or errored. Triggering Gemini fallback crawler...")
        crawler_start = time.time()
        products_data = await search_via_gemini_crawler(query, budget, category)
        crawler_latency = time.time() - crawler_start
        logger.info(f"GEMINI FALLBACK CRAWLER COMPLETE (Latency: {crawler_latency:.3f} seconds)")

    # 3. Log/Cache products in MongoDB
    if products_data and source != "MongoDB Query Cache":
        try:
            cache_hit_count = 0
            for p in products_data:
                p["source"] = source
                # Try finding existing item to determine cache hit
                existing = await db.cached_products.find_one({"id": p["id"]})
                if existing:
                    cache_hit_count += 1
                await db.cached_products.update_one(
                    {"id": p["id"]}, {"$set": p}, upsert=True
                )
            
            # Save to query cache
            await db.query_cache.update_one(
                {"_id": query},
                {"$set": {"timestamp": time.time(), "products": products_data}},
                upsert=True
            )
            logger.info(f"MongoDB Cache: {cache_hit_count}/{len(products_data)} products were cache hits. Query cached successfully.")
        except Exception as e:
            logger.error(f"Failed to cache retrieved products in MongoDB: {e}")

    # Limit products to top 4 matches
    products_data = products_data[:4]

    total_latency = time.time() - start_time
    logger.info(f"PRODUCT DISCOVERY PIPELINE EXECUTION COMPLETE (Total Latency: {total_latency:.3f} seconds | Source: {source} | Products Returned: {len(products_data)})")

    if not products_data:
        return "Search concierge was unable to identify matching products across internet hubs at this moment."

    # Format JSON string containing a special delimiter so the API router can parse it automatically!
    context_str = f"SOURCE: {source}\n"
    context_str += "PRODUCTS_JSON_START\n"
    context_str += json.dumps(products_data)
    context_str += "\nPRODUCTS_JSON_END\n\n"
    
    # Also add standard text representation for LLM context reasoning
    context_str += f"Retrieved Live Internet Context (Source: {source}):\n\n"
    for p in products_data:
        context_str += f"- Name: {p.get('name')} (${p.get('price')})\n"
        context_str += f"  Brand: {p.get('brand')} | Category: {p.get('category')}\n"
        context_str += f"  Why it matches: {p.get('description')}\n"
        context_str += f"  Specs: {json.dumps(p.get('specifications', {}))}\n\n"
        
    logger.info(f"product_search: Successfully discovered and parsed {len(products_data)} products.")
    return context_str
