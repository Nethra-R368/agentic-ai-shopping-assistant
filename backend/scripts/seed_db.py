import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def seed_database():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(uri)
    db = client["ecommerce_ai"]

    print("Clearing existing collections...")
    await db.products.drop()
    await db.reviews.drop()

    print("Loading products...")
    with open("data/products.json", "r") as f:
        products = json.load(f)
    
    # Insert products and keep track of mapping between old id and MongoDB _id
    id_mapping = {}
    for p in products:
        old_id = p.pop("id")
        result = await db.products.insert_one(p)
        id_mapping[old_id] = str(result.inserted_id)

    print("Loading reviews...")
    with open("data/reviews.json", "r") as f:
        reviews = json.load(f)
    
    for r in reviews:
        r.pop("id", None)
        # Link review to new MongoDB product _id
        old_product_id = r["product_id"]
        if old_product_id in id_mapping:
            r["product_id"] = id_mapping[old_product_id]
            await db.reviews.insert_one(r)

    print("Database seeded successfully!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
