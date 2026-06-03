import asyncio
import time
import uuid
from api.chat import chat_with_assistant
from models.schemas import ChatRequest

async def run_query(query: str, session_id: str):
    print(f"\n==================================================")
    print(f"Testing query: {query}")
    print(f"==================================================")
    
    request = ChatRequest(message=query, session_id=session_id)
    
    start_time = time.time()
    
    try:
        response = await chat_with_assistant(request)
        end_time = time.time()
        latency = end_time - start_time
        
        print(f"\nResponse received in {latency:.2f}s:")
        print(f"Text: {response.text}")
        print(f"Products Found: {len(response.products)}")
        
    except Exception as e:
        print(f"Error calling API: {e}")

async def main():
    # Test Tier 1: Fast-Path
    fast_path_query = "best laptop under 50000"
    session_1 = f"fastpath-test-{uuid.uuid4()}"
    await run_query(fast_path_query, session_1)
    
    # Test Tier 2: LangGraph Comparison
    complex_query = "compare iPhone vs Samsung"
    session_2 = f"langgraph-test-{uuid.uuid4()}"
    await run_query(complex_query, session_2)

if __name__ == "__main__":
    asyncio.run(main())
