import time
import re
import json
from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse, ProductSchema
from langchain_core.messages import HumanMessage, ToolMessage
from agents.graph import workflow
from database.memory import memory_manager
from core.logger import logger
from tools.product_search import product_search
from core.config import settings
from langchain_google_genai import ChatGoogleGenerativeAI

router = APIRouter()

# We cache the compiled app so we don't compile it on every request
_compiled_app = None

# Fast-path summarization LLM
fast_llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite", 
    temperature=0.2,
    google_api_key=settings.GEMINI_API_KEY
)

def get_compiled_app():
    global _compiled_app
    if _compiled_app is None:
        checkpointer = memory_manager.checkpointer
        if checkpointer:
            _compiled_app = workflow.compile(checkpointer=checkpointer)
            logger.info("LangGraph workflow compiled with MongoDB checkpointer.")
        else:
            _compiled_app = workflow.compile()
            logger.warning("LangGraph workflow compiled WITHOUT checkpointer (Memory disabled).")
    return _compiled_app

def is_fast_path(query: str) -> bool:
    # Exclude complex comparisons from fast path
    exclusion_pattern = r"(?i)\b(compare|vs|cheapest|best value|alternative|better than)\b"
    if re.search(exclusion_pattern, query):
        return False

    # Tier 1 Regex: matches simple queries like "best laptop under 50000" or "find a phone"
    pattern = r"(?i)\b(best|cheap|affordable|top|find|recommend|suggest)\s+([a-zA-Z\s]+)\s*(under|below|less than|for)?\s*[\$₹]?\s*(\d+(?:,\d+)*)?"
    return bool(re.search(pattern, query))

@router.post("", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    try:
        t_start = time.time()
        logger.info("[TELEMETRY] 1. Request Received")
        
        session_id = request.session_id
        
        # FAST-PATH DETECTION
        t_detect_start = time.time()
        
        has_image = bool(request.image)
        if has_image:
            image_size_kb = len(request.image) * 0.75 / 1024
            logger.info(f"[TELEMETRY] Multimodal Image Received | Size: {image_size_kb:.2f} KB")
        
        use_fast_path = is_fast_path(request.message) and not has_image
        t_detect = time.time() - t_detect_start
        
        if has_image and is_fast_path(request.message):
            logger.info("[TELEMETRY] Fast-Path Skipped: True (Multimodal Image detected)")
            
        logger.info(f"[TELEMETRY] 3. Fast-Path Detection Time: {t_detect:.4f}s | Result: {use_fast_path}")
        
        if use_fast_path:
            logger.info("Executing Tier 1 Fast-Path Pipeline")
            
            # TOOL EXECUTION
            t_tool_start = time.time()
            tool_output_str = await product_search.ainvoke({"query": request.message})
            t_tool = time.time() - t_tool_start
            logger.info(f"[TELEMETRY] 6. Tool Execution Time (includes SerpAPI): {t_tool:.4f}s")
            
            extracted_products = []
            json_text = "[]"
            if "PRODUCTS_JSON_START" in tool_output_str:
                start_idx = tool_output_str.find("PRODUCTS_JSON_START") + len("PRODUCTS_JSON_START")
                end_idx = tool_output_str.find("PRODUCTS_JSON_END")
                json_text = tool_output_str[start_idx:end_idx].strip()
                try:
                    products_list = json.loads(json_text)
                    for item in products_list:
                        product_obj = ProductSchema(
                            name=item.get("name"),
                            brand=item.get("brand"),
                            category=item.get("category"),
                            description=item.get("description", ""),
                            price=float(item.get("price", 0)),
                            rating=float(item.get("rating", 0)),
                            image_url=item.get("image_url"),
                            specifications=item.get("specifications", {}),
                            product_url=item.get("product_url"),
                            source=item.get("source"),
                            seller=item.get("seller")
                        )
                        extracted_products.append(product_obj)
                except Exception as ex:
                    logger.error(f"Failed to parse fast-path JSON: {ex}")
            
            # GEMINI REASONING
            t_llm_start = time.time()
            prompt = f"The user asked: '{request.message}'. Here are the best products found:\n{json_text}\nWrite a short, engaging 2-sentence summary introducing these products. Do not list them individually, just write a conversational introduction."
            response = await fast_llm.ainvoke([HumanMessage(content=prompt)])
            response_text = ""
            if isinstance(response.content, list):
                for block in response.content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        response_text += block.get("text", "")
                    elif isinstance(block, str):
                        response_text += block
            else:
                response_text = str(response.content)
            t_llm = time.time() - t_llm_start
            logger.info(f"[TELEMETRY] 8. Gemini Reasoning Time (Fast-Path): {t_llm:.4f}s")
            
            # RESPONSE SERIALIZATION
            t_serialize_start = time.time()
            chat_response = ChatResponse(sender="bot", text=response_text, products=extracted_products)
            t_serialize = time.time() - t_serialize_start
            logger.info(f"[TELEMETRY] 9. Response Serialization Time: {t_serialize:.4f}s")
            
            t_total = time.time() - t_start
            logger.info(f"[TELEMETRY] 10. Total Latency (Fast-Path): {t_total:.4f}s")
            return chat_response

        # LANGGRAPH TIER 2/3 PATH
        logger.info("Executing Tier 2/3 LangGraph Pipeline")
        
        if has_image:
            logger.info("[TELEMETRY] Route Selected: Multimodal Vision Pipeline")
            logger.info("[TELEMETRY] Gemini Vision Invoked: True")
        
        t_memory_start = time.time()
        app = get_compiled_app()
        t_memory = time.time() - t_memory_start
        logger.info(f"[TELEMETRY] 2. Memory Retrieval Time (and app compilation): {t_memory:.4f}s")
        
        t_lg_start = time.time()
        
        if has_image:
            # Langchain handles data:image/... URIs natively if passed correctly
            user_msg = HumanMessage(content=[
                {"type": "text", "text": request.message},
                {"type": "image_url", "image_url": {"url": request.image}}
            ])
        else:
            user_msg = HumanMessage(content=request.message)
        logger.info("Invoking LangGraph multi-agent workflow...")
        t_lg = time.time() - t_lg_start
        logger.info(f"[TELEMETRY] 4. LangGraph Startup Time: {t_lg:.4f}s")
        
        final_state = await app.ainvoke(
            {"messages": [user_msg]},
            config={"configurable": {"thread_id": session_id}} 
        )
        
        t_serialize_start = time.time()
        ai_response = final_state["messages"][-1]
        response_text = ""
        if isinstance(ai_response.content, list):
            for block in ai_response.content:
                if isinstance(block, dict) and block.get("type") == "text":
                    response_text += block.get("text", "")
                elif isinstance(block, str):
                    response_text += block
        else:
            response_text = str(ai_response.content)

        extracted_products = []
        for msg in reversed(final_state["messages"]):
            if getattr(msg, "type", None) == "human":
                break
            content_str = str(msg.content)
            if "PRODUCTS_JSON_START" in content_str and "PRODUCTS_JSON_END" in content_str:
                try:
                    start_idx = content_str.find("PRODUCTS_JSON_START") + len("PRODUCTS_JSON_START")
                    end_idx = content_str.find("PRODUCTS_JSON_END")
                    json_text = content_str[start_idx:end_idx].strip()
                    products_list = json.loads(json_text)
                    for item in reversed(products_list):
                        product_obj = ProductSchema(
                            name=item.get("name"),
                            brand=item.get("brand"),
                            category=item.get("category"),
                            description=item.get("description", ""),
                            price=float(item.get("price", 0)),
                            rating=float(item.get("rating", 0)),
                            image_url=item.get("image_url"),
                            specifications=item.get("specifications", {}),
                            product_url=item.get("product_url"),
                            source=item.get("source"),
                            seller=item.get("seller")
                        )
                        extracted_products.insert(0, product_obj)
                except Exception as ex:
                    logger.error(f"Failed to parse extracted product JSON: {ex}")

        chat_response = ChatResponse(sender="bot", text=response_text, products=extracted_products)
        t_serialize = time.time() - t_serialize_start
        logger.info(f"[TELEMETRY] 9. Response Serialization Time: {t_serialize:.4f}s")
        
        t_total = time.time() - t_start
        logger.info(f"[TELEMETRY] 10. Total Latency (LangGraph): {t_total:.4f}s")
        return chat_response

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again later.")
