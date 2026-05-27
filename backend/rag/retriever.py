from rag.embeddings import get_embedding
from rag.faiss_store import faiss_store
from database.mongodb import get_database
from bson.objectid import ObjectId

async def retrieve_context(query: str, top_k: int = 3) -> str:
    """
    RAG Retriever Pipeline:
    1. Embeds the user query
    2. Searches FAISS for top_k similar product vectors
    3. Fetches the full product details from MongoDB using the retrieved IDs
    4. Formats it into a context string for the LLM
    """
    db = get_database()
    
    # 1. Embed query
    query_vector = get_embedding(query)
    
    # 2. Search FAISS
    results = faiss_store.search(query_vector, k=top_k)
    
    if not results:
        return "No relevant products found in the database."

    # 3. Fetch from MongoDB
    product_ids = [ObjectId(res["product_id"]) for res in results]
    cursor = db.products.find({"_id": {"$in": product_ids}})
    products = await cursor.to_list(length=top_k)
    
    # 4. Format context
    context = "Retrieved Context:\n\n"
    for p in products:
        context += f"- Product ID: {str(p['_id'])}\n"
        context += f"  Name: {p.get('name')}\n"
        context += f"  Price: ${p.get('price')}\n"
        context += f"  Category: {p.get('category')}\n"
        context += f"  Description: {p.get('description')}\n"
        if 'specifications' in p:
            context += f"  Specs: {p.get('specifications')}\n"
        context += "\n"
        
    return context
