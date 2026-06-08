from langgraph.checkpoint.memory import MemorySaver
from core.logger import logger

class MemoryManager:
    """
    Manages LangGraph conversational checkpoints in-memory.
    This avoids the need for a database.
    """
    def __init__(self):
        self._checkpointer = MemorySaver()

    @property
    def checkpointer(self):
        return self._checkpointer

memory_manager = MemoryManager()
