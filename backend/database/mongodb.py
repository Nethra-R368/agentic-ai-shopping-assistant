"""MongoDB access.

Uses MongoDB (e.g. Atlas) when MONGO_URI is set; otherwise falls back to an
in-memory mongomock database with the same async Motor API, so the app runs
locally with zero setup. In-memory data is lost on restart.
"""
from core.config import settings
from core.logger import logger


class Database:
    client = None
    db = None
    mode = "uninitialised"


db_config = Database()


async def connect_to_mongo():
    if settings.MONGO_URI:
        from motor.motor_asyncio import AsyncIOMotorClient

        try:
            client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
            await client.admin.command("ping")
            db_config.client = client
            db_config.db = client[settings.MONGO_DB_NAME]
            db_config.mode = "mongodb"
            logger.info("Connected to MongoDB.")
        except Exception as e:  # pragma: no cover - depends on network
            logger.error(f"MongoDB connection failed ({e}); falling back to in-memory database.")

    if db_config.db is None:
        from mongomock_motor import AsyncMongoMockClient

        db_config.client = AsyncMongoMockClient()
        db_config.db = db_config.client[settings.MONGO_DB_NAME]
        db_config.mode = "in-memory"
        logger.warning("MONGO_URI not set: using in-memory database (data resets on restart).")

    await _ensure_indexes(db_config.db)


async def _ensure_indexes(db):
    try:
        await db.users.create_index("email", unique=True)
        await db.wishlist.create_index([("user_id", 1), ("product_key", 1)], unique=True)
        await db.alerts.create_index("user_id")
        await db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
    except Exception as e:  # mongomock supports these, but never block startup on indexes
        logger.warning(f"Index creation skipped: {e}")


async def close_mongo_connection():
    if db_config.client is not None and db_config.mode == "mongodb":
        db_config.client.close()


def get_database():
    if db_config.db is None:
        raise RuntimeError("Database not initialised; connect_to_mongo() must run first.")
    return db_config.db
