import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import alerts, auth, chat, products, wishlist
from core.config import settings
from core.logger import logger
from database.mongodb import close_mongo_connection, connect_to_mongo, db_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    if settings.ENVIRONMENT == "production" and settings.JWT_SECRET == "dev-only-insecure-secret-change-me-in-production":
        logger.error("JWT_SECRET is the default value - set a long random secret in production!")
    logger.info(f"AuraBuy API ready | gemini={settings.has_gemini} serpapi={settings.has_serpapi} db={db_config.mode}")
    yield
    await close_mongo_connection()


app = FastAPI(
    title="AuraBuy API",
    description="Agentic AI shopping concierge: product discovery, AI insights, comparison, wishlist and price alerts.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(chat.conversations_router, prefix="/api/conversations", tags=["Conversations"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(wishlist.router, prefix="/api/wishlist", tags=["Wishlist"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Price alerts"])


@app.get("/")
async def root():
    return {"name": "AuraBuy API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "database": db_config.mode,
        "ai": settings.has_gemini,
        "live_search": settings.has_serpapi,
        "mode": "live" if settings.has_serpapi else ("ai" if settings.has_gemini else "demo"),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
