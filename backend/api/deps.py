import time
from collections import defaultdict, deque
from typing import Optional

from bson import ObjectId
from fastapi import Depends, Header, HTTPException, Request

from core.security import decode_access_token
from database.mongodb import get_database


async def get_optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    user_id = decode_access_token(authorization.split(" ", 1)[1])
    if not user_id or not ObjectId.is_valid(user_id):
        return None
    return await get_database().users.find_one({"_id": ObjectId(user_id)})


async def get_current_user(user: Optional[dict] = Depends(get_optional_user)) -> dict:
    if user is None:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


class RateLimiter:
    """Small in-process sliding-window limiter (per client IP)."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window = window_seconds
        self.hits: dict[str, deque] = defaultdict(deque)

    async def __call__(self, request: Request):
        key = request.client.host if request.client else "anon"
        now = time.time()
        q = self.hits[key]
        while q and now - q[0] > self.window:
            q.popleft()
        if len(q) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests — please slow down a little.")
        q.append(now)


chat_limiter = RateLimiter(max_requests=20, window_seconds=60)
