import asyncio
import os
import sys

# Add parent directory to path to allow importing from rag
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.mongodb import connect_to_mongo, close_mongo_connection, get_database
from rag.embeddings import get_embeddings
from rag.faiss_store import faiss_store

async def build_vector_index():
    print("Connecting to DB...")
    await connect_to_mongo()
    db = get_database()

    print("Fetching products...")
    cursor = db.products.find({})
    products = await cursor.to_list(length=1000)

    if not products:
        print("No products found in DB. Did you run seed_db.py?")
        await close_mongo_connection()
        return

    texts_to_embed = []
    metadata = []

    for p in products:
        # Create a rich text representation for semantic search
        text = f"{p['name']}. {p.get('description', '')}. Category: {p.get('category', '')}. Brand: {p.get('brand', '')}."
        if 'specifications' in p:
            specs = ", ".join([f"{k}: {v}" for k, v in p['specifications'].items()])
            text += f" Specs: {specs}"
        
        texts_to_embed.append(text)
        metadata.append({"product_id": str(p["_id"]), "type": "product", "name": p["name"]})

    print(f"Generating embeddings for {len(texts_to_embed)} items...")
    vectors = get_embeddings(texts_to_embed)

    print("Adding to FAISS index...")
    faiss_store.add_vectors(vectors, metadata)
    
    await close_mongo_connection()
    print("Vector index built successfully!")

if __name__ == "__main__":
    asyncio.run(build_vector_index())
