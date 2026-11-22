"""Gemini helpers. Every caller must handle get_llm() returning None (no API key)."""
import json
import re
from functools import lru_cache

from core.config import settings


@lru_cache(maxsize=4)
def get_llm(temperature: float = 0.2):
    if not settings.has_gemini:
        return None
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        temperature=temperature,
        google_api_key=settings.GEMINI_API_KEY,
        max_retries=2,
        timeout=40,
    )


def text_of(content) -> str:
    """Flatten LangChain message content (str or list of blocks) to plain text."""
    if isinstance(content, list):
        out = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                out.append(block.get("text", ""))
            elif isinstance(block, str):
                out.append(block)
        return "".join(out)
    return str(content or "")


def parse_json(text: str):
    """Parse JSON from an LLM reply, tolerating ```json fences and leading prose."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = min([i for i in (text.find("{"), text.find("[")) if i != -1], default=-1)
        if start == -1:
            raise
        end = max(text.rfind("}"), text.rfind("]"))
        return json.loads(text[start : end + 1])
