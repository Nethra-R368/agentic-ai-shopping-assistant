import os

class Database:
    client = None
    db = None

db_config = Database()

async def connect_to_mongo():
    """Dummy connection to avoid MongoDB requirement."""
    print("MongoDB bypassed. Using in-memory storage.")

async def close_mongo_connection():
    pass

def get_database():
    return None
