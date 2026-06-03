from pydantic import BaseModel, Field
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's input message")
    session_id: str = Field(default="default-session", description="Conversation session ID")
    image: Optional[str] = Field(default=None, description="Base64 encoded image string")

class ProductSchema(BaseModel):
    name: str
    category: str
    description: str
    price: float
    rating: float
    image_url: Optional[str] = None
    brand: Optional[str] = None
    specifications: Optional[dict] = {}
    product_url: Optional[str] = None
    source: Optional[str] = None
    seller: Optional[str] = None

class ChatResponse(BaseModel):
    sender: str
    text: str
    products: Optional[List[ProductSchema]] = []
