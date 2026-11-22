import time

from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from api.deps import get_current_user
from core.security import create_access_token, hash_password, verify_password
from database.mongodb import get_database
from models.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter()


def to_user_out(user: dict) -> UserOut:
    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest):
    db = get_database()
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    doc = {"name": body.name.strip(), "email": email, "password": hash_password(body.password), "created_at": time.time()}
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    doc["_id"] = result.inserted_id
    return AuthResponse(token=create_access_token(str(result.inserted_id)), user=to_user_out(doc))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    user = await get_database().users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return AuthResponse(token=create_access_token(str(user["_id"])), user=to_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return to_user_out(user)
