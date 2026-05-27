from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import ToolNode
import os
from dotenv import load_dotenv

from tools.product_search import product_search
from tools.product_compare import product_compare
from tools.review_summarizer import review_summarizer
from tools.budget_analyzer import budget_analyzer
from agents.state import AgentState
from rag.prompts import SYSTEM_PROMPT
from core.config import settings

from tenacity import retry, stop_after_attempt, wait_exponential
from core.logger import logger

load_dotenv()

# 1. Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash", 
    temperature=0.2,
    google_api_key=settings.GEMINI_API_KEY
)

# 2. Define the tools available to the routing agent
tools = [
    product_search,
    product_compare,
    review_summarizer,
    budget_analyzer
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
    
    # We prepend a system message instructing the LLM on its persona and constraints
    system_message = {"role": "system", "content": SYSTEM_PROMPT.format(context="You are currently chatting with a user.")}
    
    try:
        # Call the LLM with retry logic
        response = invoke_llm_with_retry([system_message] + messages)
        
        # Log if the LLM decided to call tools
        if hasattr(response, 'tool_calls') and response.tool_calls:
            tools_called = [tc['name'] for tc in response.tool_calls]
            logger.info(f"Agent decided to call tools: {tools_called}. Routing to ToolNode.")
        else:
            logger.info("Agent formulated final response. Routing to END.")
            
        return {"messages": [response]}
    except Exception as e:
        logger.error(f"Agent failed after multiple retries: {e}")
        # Fallback response
        from langchain_core.messages import AIMessage
        return {"messages": [AIMessage(content="I'm sorry, I am experiencing temporary connectivity issues. Please try again in a moment.")]}
