from langchain_core.messages import AIMessage, SystemMessage
from langgraph.prebuilt import ToolNode

from agents.prompts import SYSTEM_PROMPT
from agents.state import AgentState
from core.logger import logger
from services.llm import get_llm
from tools.product_search import product_search

tools = [product_search]
tool_node = ToolNode(tools)

MAX_TOOL_ROUNDS = 3


async def chatbot_agent(state: AgentState):
    """Reasoning node: answer directly or request product_search calls."""
    llm = get_llm(0.2)
    if llm is None:
        return {"messages": [AIMessage(content="The AI agent needs a GEMINI_API_KEY to answer that.")]}

    messages = list(state["messages"])
    tool_rounds = sum(1 for m in messages if getattr(m, "type", None) == "tool")
    model = llm if tool_rounds >= MAX_TOOL_ROUNDS else llm.bind_tools(tools)
    try:
        response = await model.ainvoke([SystemMessage(content=SYSTEM_PROMPT)] + messages)
    except Exception as e:
        logger.error(f"Agent LLM call failed: {e}")
        response = AIMessage(content="Sorry — I hit a problem reaching the AI model. Please try again in a moment.")
    return {"messages": [response]}
