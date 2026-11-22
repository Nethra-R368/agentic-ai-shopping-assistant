from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Products ----------
class ProductInsight(BaseModel):
    why: str = ""
    pros: List[str] = []
    cons: List[str] = []
    badge: Optional[str] = None  # e.g. "Best overall", "Best value", "Budget pick"


class Product(BaseModel):
    id: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    description: str = ""
    price: float = 0.0
    original_price: Optional[float] = None
    currency: str = "INR"
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    seller: Optional[str] = None
    provider: str = "demo"  # serpapi | ai | demo
    specifications: dict = {}
    insight: Optional[ProductInsight] = None


# ---------- Chat ----------
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default-session", max_length=100)
    image: Optional[str] = Field(default=None, description="data: URL of an image")


class ChatResponse(BaseModel):
    text: str
    products: List[Product] = []
    route: str = "search"
    provider: Optional[str] = None


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# ---------- Wishlist ----------
class WishlistItem(BaseModel):
    product: Product
    added_at: float


# ---------- Alerts ----------
class AlertCreate(BaseModel):
    product: Product
    target_price: float = Field(..., gt=0)


class Alert(BaseModel):
    id: str
    product: Product
    target_price: float
    current_price: float
    lowest_price: float
    triggered: bool
    created_at: float
    last_checked: float
    history: List[dict] = []


# ---------- Compare ----------
class CompareRequest(BaseModel):
    products: List[Product] = Field(..., min_length=2, max_length=4)
    use_case: Optional[str] = Field(default=None, max_length=300)


class CompareRow(BaseModel):
    label: str
    values: List[str]
    winner: Optional[int] = None


class CompareResponse(BaseModel):
    verdict: str
    winner_index: Optional[int] = None
    rows: List[CompareRow]
    ai: bool = False
