from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import tools_condition
from agents.state import AgentState
from agents.nodes import chatbot_agent, tool_node

# 1. Initialize the StateGraph
workflow = StateGraph(AgentState)

# 2. Add the Nodes
# We have two main nodes: the LLM reasoning agent, and the Tool execution node
workflow.add_node("agent", chatbot_agent)
workflow.add_node("tools", tool_node)

# 3. Define the Edges & Routing Logic
# Start the workflow at the agent
workflow.add_edge(START, "agent")

# After the agent runs, we check if it decided to call a tool.
# `tools_condition` is a built-in router that checks the last message.
# If there are tool calls, it routes to the "tools" node. 
# Otherwise, it routes to END (meaning the agent is done and has a final answer).
workflow.add_conditional_edges(
    "agent",
    tools_condition,
    {
        "tools": "tools",  # Route to tools node
        END: END           # Finished
    }
)

# After the tools finish executing, we MUST route back to the agent
# so the LLM can read the tool's output and synthesize a final response.
workflow.add_edge("tools", "agent")

# 4. We do not compile the graph here anymore.
# We compile it in api/chat.py where we can inject the MongoDB checkpointer.
