import logging
import sys
from core.config import settings

def setup_logger(name: str) -> logging.Logger:
    """
    Creates a structured, production-ready logger.
    Logs output to the terminal so we can trace LangGraph and tool execution.
    """
    logger = logging.getLogger(name)
    logger.setLevel(settings.LOG_LEVEL)

    # Avoid duplicate logs if already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        file_handler = logging.FileHandler("backend_debug.log")
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - [%(levelname)s] - %(message)s'
        )
        handler.setFormatter(formatter)
        file_handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.addHandler(file_handler)

    return logger

logger = setup_logger("ecommerce_ai")
