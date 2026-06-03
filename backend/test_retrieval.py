import asyncio
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.logger import logger
from agents.graph import workflow
from langchain_core.messages import HumanMessage
from database.mongodb import connect_to_mongo, close_mongo_connection
from database.memory import memory_manager

async def main():
    await connect_to_mongo()
    
    app = workflow.compile(checkpointer=memory_manager.checkpointer)
    
    queries = [
        "best air fryer under ₹5000",
        "best mobile under ₹100000",
        "best editing laptop under ₹50000"
    ]
    
    for q in queries:
        print(f"\n{'='*50}\nTesting query: {q.encode('utf-8')}\n{'='*50}")
        session_id = str(uuid.uuid4())
        
        user_msg = HumanMessage(content=q)
        final_state = await app.ainvoke(
            {"messages": [user_msg]},
            config={"configurable": {"thread_id": session_id}} 
        )
        
        print("\nFinal response:")
        ai_response = final_state["messages"][-1]
        print(ai_response.content.encode('utf-8', errors='ignore').decode('utf-8'))

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
