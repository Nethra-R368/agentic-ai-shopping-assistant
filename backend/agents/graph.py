from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import tools_condition

from agents.nodes import chatbot_agent, tool_node
from agents.state import AgentState

# agent -> (tools -> agent)* -> END
workflow = StateGraph(AgentState)
workflow.add_node("agent", chatbot_agent)
workflow.add_node("tools", tool_node)
workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", tools_condition, {"tools": "tools", END: END})
workflow.add_edge("tools", "agent")

# Conversation history is persisted in MongoDB by api/chat.py and replayed
# into the graph each turn, so no LangGraph checkpointer is needed.
agent_app = workflow.compile()
