from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's input message")
    session_id: str = Field(default="default-session", description="Conversation session ID")

class ProductSchema(BaseModel):
    name: str
    category: str
    description: str
    price: float
    rating: float
    image_url: Optional[str] = None
    brand: Optional[str] = None
    specifications: Optional[dict] = {}

class ChatResponse(BaseModel):
    sender: str
    text: str
    products: Optional[List[ProductSchema]] = []
