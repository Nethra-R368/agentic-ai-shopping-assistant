from langchain_core.messages import AIMessage, SystemMessage
from langgraph.prebuilt import ToolNode

from agents.prompts import SYSTEM_PROMPT
from agents.state import AgentState
from core.logger import logger
from services.llm import get_llm, get_tool_llm
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
    # A "round" is one model turn that requested tools; parallel calls in one turn count once.
    tool_rounds = sum(1 for m in messages if getattr(m, "tool_calls", None))
    system = SYSTEM_PROMPT
    if tool_rounds >= MAX_TOOL_ROUNDS:
        # Keep tools declared (Gemini returns an empty turn if the history has tool calls but no tools),
        # but stop further searching and ask for the final answer.
        model = get_tool_llm(tools, 0.2, tool_choice="none")
        system += "\nYou have enough search results. Write the final answer now; do not search again."
    else:
        model = get_tool_llm(tools, 0.2)
    try:
        response = await model.ainvoke([SystemMessage(content=system)] + messages)
    except Exception as e:
        logger.error(f"Agent LLM call failed: {e}")
        response = AIMessage(content="Sorry — I hit a problem reaching the AI model. Please try again in a moment.")
    return {"messages": [response]}
