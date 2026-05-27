import os
from motor.motor_asyncio import AsyncIOMotorClient

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_config = Database()

async def connect_to_mongo():
    """Connect to MongoDB on app startup."""
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_config.client = AsyncIOMotorClient(uri)
    db_config.db = db_config.client["ecommerce_ai"]
    print("Connected to MongoDB!")

async def close_mongo_connection():
    """Close MongoDB connection on app shutdown."""
    if db_config.client:
        db_config.client.close()
        print("Closed MongoDB connection.")

def get_database():
    """Dependency to get the database instance."""
    return db_config.db
