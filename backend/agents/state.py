from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    """
    Represents the state of our multi-agent workflow.
    - messages: A list of messages (HumanMessage, AIMessage, ToolMessage). 
      The `add_messages` reducer appends new messages instead of overwriting.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]
