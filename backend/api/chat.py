from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse
from langchain_core.messages import HumanMessage
from agents.graph import workflow
from database.memory import memory_manager
from core.logger import logger

router = APIRouter()

# We cache the compiled app so we don't compile it on every request
_compiled_app = None

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

@router.post("", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Main endpoint for the conversational AI.
    Features:
    - Persistent MongoDB Conversational Memory via Checkpointer
    - Structured Logging
    - Explainable AI RAG logic
    """
    try:
        session_id = request.session_id
        logger.info(f"Received chat request for session: {session_id}")
        
        # 1. Get the compiled graph
        app = get_compiled_app()
        
        # 2. Prepare the input message. 
        # Since we use a Checkpointer, we DO NOT need to pass the entire history.
        # LangGraph automatically loads the history from MongoDB based on the thread_id!
        user_msg = HumanMessage(content=request.message)
        
        logger.info("Invoking LangGraph multi-agent workflow...")
        
        # 3. Execute the workflow
        # The thread_id tells the MongoDB checkpointer which conversation to load/save.
        final_state = await app.ainvoke(
            {"messages": [user_msg]},
            config={"configurable": {"thread_id": session_id}} 
        )
        
        logger.info(f"LangGraph execution completed successfully for session: {session_id}")

        # 4. Extract the final response
        ai_response = final_state["messages"][-1]
        
        # Handle cases where content is a list of blocks (e.g. Gemini 3.5)
        response_text = ""
        if isinstance(ai_response.content, list):
            logger.info("Extracting response text from a list of blocks.")
            for block in ai_response.content:
                if isinstance(block, dict) and block.get("type") == "text":
                    response_text += block.get("text", "")
                elif isinstance(block, str):
                    response_text += block
        else:
            response_text = str(ai_response.content)

        logger.info("Successfully serialized response for frontend.")
        return ChatResponse(
            sender="bot",
            text=response_text,
            products=[] # Frontend parses product recommendations dynamically
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again later.")
