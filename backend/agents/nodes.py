from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import ToolNode
import os
from dotenv import load_dotenv

from tools.product_search import product_search
# Legacy tools disabled to compress the RAG reasoning pass to a single, high-fidelity loop:
# from tools.product_compare import product_compare
# from tools.review_summarizer import review_summarizer
# from tools.budget_analyzer import budget_analyzer
from agents.state import AgentState
from rag.prompts import SYSTEM_PROMPT
from core.config import settings

from tenacity import retry, stop_after_attempt, wait_exponential
from core.logger import logger

load_dotenv()

# Initialize the LLM with gemini-3.1-flash-lite for optimal RAG performance and reliable quota
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite", 
    temperature=0.2,
    google_api_key=settings.GEMINI_API_KEY
)

# 2. Define the tools available to the routing agent (Only product_search for single RAG loop)
tools = [
    product_search
]

# 3. Bind the tools to the LLM so it knows it can call them
llm_with_tools = llm.bind_tools(tools)

# 4. Create the ToolNode which will execute the functions when the LLM requests them
tool_node = ToolNode(tools, handle_tool_errors=True)

# 5. Define the Agent Node with Retry Logic
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def invoke_llm_with_retry(messages):
    """Wrapper to invoke LLM with exponential backoff retries."""
    return llm_with_tools.invoke(messages)

def chatbot_agent(state: AgentState):
    """
    The main reasoning agent. It looks at the conversation history and the system prompt,
    and decides whether to respond directly to the user or call a tool.
    """
    logger.info("Agent: Analyzing conversation state and determining next action...")
    messages = state["messages"]
    
    # TRUNCATE history cleanly to prevent Gemini API tool-matching errors and token overflow
    last_human_idx = 0
    for i in range(len(messages) - 1, -1, -1):
        if getattr(messages[i], 'type', None) == 'human':
            last_human_idx = i
            break
            
    history = messages[:last_human_idx]
    current_turn = messages[last_human_idx:]
    
    clean_hist = []
    for msg in history:
        if getattr(msg, 'type', None) in ['human', 'ai']:
            if getattr(msg, 'tool_calls', None):
                continue
            clean_hist.append(msg)
            
    safe_messages = clean_hist[-4:] + current_turn
    
    # We prepend a system message instructing the LLM on its persona and constraints
    system_message = {"role": "system", "content": SYSTEM_PROMPT.format(context="You are currently chatting with a user.")}
    
    try:
        import time
        
        t_routing_start = time.time()
        # Call the LLM with retry logic
        response = invoke_llm_with_retry([system_message] + safe_messages)
        t_routing = time.time() - t_routing_start
        
        # Log if the LLM decided to call tools
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tools_called = [tc['name'] for tc in response.tool_calls]
            logger.info(f"[TELEMETRY] 5. Agent Routing Time: {t_routing:.4f}s | Decided to call tools: {tools_called}")
            logger.info(f"Agent decided to call tools: {tools_called}. Routing to ToolNode.")
        else:
            logger.info(f"[TELEMETRY] 8. Gemini Reasoning Time (LangGraph): {t_routing:.4f}s")
            logger.info("Agent formulated final response. Routing to END.")
            
        return {"messages": [response]}
    except Exception as e:
        logger.error(f"Agent failed after multiple retries: {e}")
        # Fallback response
        from langchain_core.messages import AIMessage
        return {"messages": [AIMessage(content="I'm sorry, I am experiencing temporary connectivity issues. Please try again in a moment.")]}
