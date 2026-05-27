from langgraph.checkpoint.mongodb import MongoDBSaver
from database.mongodb import db_config
from core.logger import logger

class MongoMemoryManager:
    """
    Manages LangGraph conversational checkpoints in MongoDB.
    This allows conversational history to persist across server restarts.
    """
    def __init__(self):
        self._checkpointer = None
        self._sync_client = None

    @property
    def checkpointer(self):
        # We instantiate this lazily because db_config.client is created in an async context
        if self._checkpointer is None:
            if db_config.client is None:
                logger.warning("MongoDB client is not initialized. Memory will not persist.")
                return None
            
            # Using langgraph's native MongoDB saver
            # MongoDBSaver requires a synchronous pymongo client
            import os
            from pymongo import MongoClient
            uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
            self._sync_client = MongoClient(uri)
            self._checkpointer = MongoDBSaver(self._sync_client)
        return self._checkpointer

memory_manager = MongoMemoryManager()
