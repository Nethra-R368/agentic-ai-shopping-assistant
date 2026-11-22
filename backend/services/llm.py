"""Gemini helpers. Every caller must handle get_llm() returning None (no API key).

Calls go to GEMINI_MODEL and automatically fall back to GEMINI_FALLBACK_MODEL when the
primary errors (e.g. Google's "503 model is experiencing high demand").
"""
import json
import re
from functools import lru_cache

from core.config import settings


@lru_cache(maxsize=8)
def _chat_model(name: str, temperature: float):
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=name,
        temperature=temperature,
        google_api_key=settings.GEMINI_API_KEY,
        max_retries=1,  # fail over to the backup model quickly instead of retrying a busy one
        timeout=40,
    )


def _models(temperature: float):
    names = [settings.GEMINI_MODEL]
    if settings.GEMINI_FALLBACK_MODEL and settings.GEMINI_FALLBACK_MODEL != settings.GEMINI_MODEL:
        names.append(settings.GEMINI_FALLBACK_MODEL)
    return [_chat_model(n, temperature) for n in names]


def _with_fallbacks(runnables):
    return runnables[0].with_fallbacks(runnables[1:]) if len(runnables) > 1 else runnables[0]


@lru_cache(maxsize=4)
def get_llm(temperature: float = 0.2):
    """Plain chat model (with backup model), or None when no API key is configured."""
    if not settings.has_gemini:
        return None
    return _with_fallbacks(_models(temperature))


def get_tool_llm(tools: list, temperature: float = 0.2, tool_choice: str | None = None):
    """Tool-calling chat model (with backup model), or None when no API key is configured."""
    if not settings.has_gemini:
        return None
    kwargs = {"tool_choice": tool_choice} if tool_choice else {}
    return _with_fallbacks([m.bind_tools(tools, **kwargs) for m in _models(temperature)])


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
