"""Chat endpoints.

Two routes per message:
  - "search": fast path. Search stores -> AI insights + summary (one LLM call).
  - "agent":  LangGraph tool-calling agent for comparisons, follow-ups, images and open questions.

/api/chat/stream sends Server-Sent Events:
  status   {"text"}                  progress the user can see (real steps, not fake)
  products {"products", "provider"}  product cards (sent again once insights are ready)
  token    {"text"}                  answer text (streamed token-by-token on the agent route)
  done     {"route", "provider", "session_id"}
  error    {"detail"}
"""
import json
import re
import time
from typing import AsyncIterator, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage

from api.deps import chat_limiter, get_current_user, get_optional_user
from core.config import settings
from core.logger import logger
from database.mongodb import get_database
from models.schemas import ChatRequest, ChatResponse, Product
from services import insights
from services.llm import text_of
from services.search import clean_query, search_products
from tools.product_search import extract_products

router = APIRouter()
conversations_router = APIRouter()

AGENT_RE = re.compile(
    r"\b(compare|vs\.?|versus|difference|better|which (one|is)|should i|worth|alternative|review|explain|why|how (do|does|to|is|much)|what (is|are|about)|pros|cons)\b",
    re.I,
)
FOLLOWUP_RE = re.compile(
    r"\b(it|this|that|these|those|them|one|cheaper|pricier|first|second|third|last|other|instead|above)\b", re.I
)
SMALLTALK_RE = re.compile(r"^\s*(hi|hey|hello|yo|thanks|thank you|ok|okay|cool|good (morning|evening))\W*$", re.I)


def choose_route(message: str, has_image: bool, has_history: bool) -> str:
    if SMALLTALK_RE.match(message):
        return "agent" if settings.has_gemini else "smalltalk"
    if not settings.has_gemini:
        return "no_ai_image" if has_image else "search"
    if has_image or AGENT_RE.search(message):
        return "agent"
    if has_history and FOLLOWUP_RE.search(message) and len(message.split()) <= 14:
        return "agent"
    return "search"


def _interleave(groups: list[list[Product]]) -> list[Product]:
    """Round-robin across searches: [A1, B1, A2, B2, ...] so both sides of a comparison show up."""
    out = []
    for i in range(max((len(g) for g in groups), default=0)):
        out.extend(g[i] for g in groups if i < len(g))
    return out


async def _plain_answer(messages: list, found: list[Product]) -> str:
    """Tool-free fallback answer, grounded in any products the agent already found."""
    from agents.prompts import SYSTEM_PROMPT
    from langchain_core.messages import SystemMessage
    from services.llm import get_llm

    llm = get_llm(0.3)
    if llm is None:
        return ""
    context = ""
    if found:
        context = "\n\nProducts found this turn:\n" + "\n".join(
            f"- {p.name} — ₹{p.price:,.0f} — rating {p.rating} — specs {p.specifications}" for p in found[:8])
    try:
        reply = await llm.ainvoke([SystemMessage(content=SYSTEM_PROMPT + context)] + messages)
        return text_of(reply.content).strip()
    except Exception as e:
        logger.error(f"plain fallback failed: {e}")
        return ""


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


def _history_messages(turns: list[dict]) -> list:
    msgs = []
    for t in turns[-8:]:
        if t["role"] == "user":
            msgs.append(HumanMessage(content=t["content"]))
        else:
            content = t["content"]
            if t.get("products"):
                shown = "; ".join(f"{p['name']} — ₹{p['price']:,.0f} — {p.get('seller')} — rating {p.get('rating')}"
                                  for p in t["products"][:6])
                content += f"\n[Products shown to the user: {shown}]"
            msgs.append(AIMessage(content=content))
    return msgs


def _history_text(turns: list[dict]) -> str:
    return "\n".join(f"{t['role']}: {t['content'][:300]}" for t in turns[-4:])


async def _load_conversation(session_id: str, user: Optional[dict]) -> dict:
    db = get_database()
    convo = await db.conversations.find_one({"_id": session_id})
    if convo and convo.get("user_id") and (not user or convo["user_id"] != user["_id"]):
        raise HTTPException(status_code=403, detail="This conversation belongs to another account.")
    if not convo:
        convo = {"_id": session_id, "messages": [], "created_at": time.time(), "title": None}
    if user and not convo.get("user_id"):
        convo["user_id"] = user["_id"]
    return convo


async def _save_turn(convo: dict, user_text: str, had_image: bool, answer: str, products: list[Product], route: str):
    now = time.time()
    convo["messages"].append({"role": "user", "content": user_text, "image": had_image, "ts": now})
    convo["messages"].append({"role": "assistant", "content": answer, "route": route, "ts": now,
                              "products": [p.model_dump() for p in products]})
    convo["messages"] = convo["messages"][-60:]
    convo["updated_at"] = now
    convo["title"] = convo.get("title") or (user_text[:60] or "Image search")
    await get_database().conversations.replace_one({"_id": convo["_id"]}, convo, upsert=True)


async def run_chat(req: ChatRequest, user: Optional[dict]) -> AsyncIterator[str]:
    t0 = time.time()
    if req.image:
        if not req.image.startswith("data:image/"):
            yield sse("error", {"detail": "Unsupported image format."})
            return
        if len(req.image) * 0.75 > settings.MAX_IMAGE_BYTES:
            yield sse("error", {"detail": "Image is too large (max 5 MB)."})
            return

    convo = await _load_conversation(req.session_id, user)
    history = convo["messages"]
    route = choose_route(req.message, bool(req.image), bool(history))
    logger.info(f"chat route={route} session={req.session_id[:8]} msg={req.message[:60]!r}")

    answer, products, provider = "", [], None

    if route == "smalltalk":
        answer = ("Hi! I'm AuraBuy. Tell me what you're shopping for — e.g. *\"running shoes under ₹4,000\"* — "
                  "and I'll find, rank and explain the best options.")
        yield sse("token", {"text": answer})

    elif route == "no_ai_image":
        answer = ("Image search needs the Gemini API key on the server (`GEMINI_API_KEY`). "
                  "Meanwhile, describe the item in words and I'll search for it.")
        yield sse("token", {"text": answer})

    elif route == "search":
        yield sse("status", {"text": f"Searching stores for “{clean_query(req.message)}”"})
        found, provider = await search_products(req.message, limit=6)
        found = insights.rule_based_insights(found)
        if found:
            yield sse("products", {"products": [p.model_dump() for p in found], "provider": provider})
            yield sse("status", {"text": f"Analysing {len(found)} options"})
        answer, products = await insights.enrich(req.message, found, provider, _history_text(history))
        if products:
            yield sse("products", {"products": [p.model_dump() for p in products], "provider": provider})
        yield sse("token", {"text": answer})

    else:  # agent
        from agents.graph import agent_app

        if req.image:
            user_msg = HumanMessage(content=[{"type": "text", "text": req.message},
                                             {"type": "image_url", "image_url": {"url": req.image}}])
            yield sse("status", {"text": "Looking at your image"})
        else:
            user_msg = HumanMessage(content=req.message)
            yield sse("status", {"text": "Thinking"})

        seen: dict[str, Product] = {}
        groups: list[list[Product]] = []  # one list per tool call, so comparisons interleave fairly
        chunks: list[str] = []
        final_text = ""
        last_step = None
        try:
            async for ev in agent_app.astream_events({"messages": _history_messages(history) + [user_msg]},
                                                     version="v2", config={"recursion_limit": 12}):
                kind = ev["event"]
                if kind == "on_tool_start":
                    q = (ev["data"].get("input") or {}).get("query", "")
                    yield sse("status", {"text": f"Searching stores for “{q}”"})
                elif kind == "on_tool_end":
                    out = ev["data"].get("output")
                    raw = text_of(getattr(out, "content", out))
                    group = []
                    for item in extract_products(raw):
                        p = Product(**item)
                        if p.id not in seen:
                            seen[p.id] = p
                            group.append(p)
                        provider = p.provider
                    if group:
                        groups.append(group)
                    if seen:
                        yield sse("products", {"products": [p.model_dump() for p in _interleave(groups)[:8]],
                                               "provider": provider})
                        yield sse("status", {"text": "Writing recommendation"})
                elif kind == "on_chat_model_stream":
                    meta = ev.get("metadata", {})
                    # Only the agent node's text is the answer; LLM calls inside tools are internal.
                    if meta.get("langgraph_node") != "agent":
                        continue
                    piece = text_of(getattr(ev["data"].get("chunk"), "content", ""))
                    if piece:
                        step = meta.get("langgraph_step")
                        if chunks and step != last_step:
                            piece = "\n\n" + piece
                        last_step = step
                        chunks.append(piece)
                        yield sse("token", {"text": piece})
                elif kind == "on_chat_model_end" and ev.get("metadata", {}).get("langgraph_node") == "agent":
                    out = ev["data"].get("output")
                    final_text = text_of(getattr(out, "content", "")).strip() or final_text
                    finish = (getattr(out, "response_metadata", None) or {}).get("finish_reason")
                    if finish and finish not in ("STOP", "stop"):
                        logger.warning(f"agent model finish_reason={finish}")
        except Exception as e:
            logger.error(f"agent failed: {e}", exc_info=True)

        answer = "".join(chunks).strip()
        if not answer and final_text:
            # The model answered but nothing came through the token stream.
            answer = final_text
            yield sse("token", {"text": answer})
        if not answer:
            # Occasionally Gemini returns an empty turn after tool use; retry once without tools.
            answer = await _plain_answer(_history_messages(history) + [user_msg], list(seen.values()))
            if answer:
                yield sse("token", {"text": answer})
        if not answer:
            answer = "Sorry — I couldn't work that one out. Could you rephrase or name the products you mean?"
            yield sse("token", {"text": answer})
        products = insights.rule_based_insights(_interleave(groups)[:6])
        if products:
            yield sse("products", {"products": [p.model_dump() for p in products], "provider": provider})

    try:
        await _save_turn(convo, req.message, bool(req.image), answer, products, route)
    except Exception as e:
        logger.warning(f"could not save conversation: {e}")
    logger.info(f"chat done route={route} provider={provider} products={len(products)} in {time.time() - t0:.2f}s")
    yield sse("done", {"route": route, "provider": provider, "session_id": req.session_id})


@router.post("/stream")
async def chat_stream(req: ChatRequest, user: Optional[dict] = Depends(get_optional_user), _=Depends(chat_limiter)):
    async def guarded():
        try:
            async for chunk in run_chat(req, user):
                yield chunk
        except HTTPException as e:
            yield sse("error", {"detail": e.detail})
        except Exception as e:
            logger.error(f"chat stream failed: {e}", exc_info=True)
            yield sse("error", {"detail": "Something went wrong. Please try again."})

    return StreamingResponse(guarded(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, user: Optional[dict] = Depends(get_optional_user), _=Depends(chat_limiter)):
    """Non-streaming variant (same pipeline), handy for scripts and tests."""
    text, products, route, provider = [], [], "search", None
    async for raw in run_chat(req, user):
        event, data = raw.split("\n", 1)
        event = event.removeprefix("event: ")
        payload = json.loads(data.removeprefix("data: ").strip())
        if event == "token":
            text.append(payload["text"])
        elif event == "products":
            products = payload["products"]
        elif event == "error":
            raise HTTPException(status_code=400, detail=payload["detail"])
        elif event == "done":
            route, provider = payload["route"], payload["provider"]
    return ChatResponse(text="".join(text), products=products, route=route, provider=provider)


# ---------------------------------------------------------------- conversations
@conversations_router.get("")
async def list_conversations(user: dict = Depends(get_current_user)):
    docs = await get_database().conversations.find(
        {"user_id": user["_id"]}, {"title": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(50)
    return [{"id": d["_id"], "title": d.get("title") or "Conversation", "updated_at": d.get("updated_at")} for d in docs]


@conversations_router.get("/{session_id}")
async def get_conversation(session_id: str, user: dict = Depends(get_current_user)):
    d = await get_database().conversations.find_one({"_id": session_id, "user_id": user["_id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"id": d["_id"], "title": d.get("title"), "messages": d.get("messages", [])}


@conversations_router.delete("/{session_id}", status_code=204)
async def delete_conversation(session_id: str, user: dict = Depends(get_current_user)):
    await get_database().conversations.delete_one({"_id": session_id, "user_id": user["_id"]})
