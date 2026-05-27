from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Database and Routers
from database.mongodb import connect_to_mongo, close_mongo_connection
from api import chat, products, recommendations

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    await connect_to_mongo()
    yield
    # Shutdown event
    await close_mongo_connection()

app = FastAPI(
    title="AI E-commerce Shopping Assistant API",
    description="Backend API for the Agentic AI E-commerce Assistant using LangGraph, FAISS, and Gemini",
    version="1.0.0",
    lifespan=lifespan
)

from core.config import settings

# Setup CORS to allow frontend to communicate with backend
origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [origin.strip() for origin in origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Shopping Assistant API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
