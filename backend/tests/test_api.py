"""End-to-end API tests in demo mode (no API keys, in-memory DB, catalog mocked)."""
import uuid

import pytest
from fastapi.testclient import TestClient

from core.config import settings
from models.schemas import Product
from services import search
from services.search import clean_query, parse_budget, product_key


def make(name, price, rating=4.2, reviews=None, original=None):
    return Product(id=product_key(name, "demo"), name=name, price=price, rating=rating,
                   reviews_count=reviews, original_price=original, seller="Demo catalog", provider="demo",
                   description=f"{name} is a great choice. More text.")


CATALOG = [make("Alpha Laptop", 45000, 4.6, 900), make("Beta Laptop", 62000, 4.8, 120),
           make("Gamma Laptop", 38000, 3.6, original=45000)]


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "SERPAPI_API_KEY", "")
    monkeypatch.setattr(settings, "MONGO_URI", "")

    async def fake_demo(query, limit):
        return [p for p in CATALOG if any(w in p.name.lower() for w in clean_query(query).split())] or []

    monkeypatch.setattr(search, "_from_demo", fake_demo)
    from main import app
    from api.deps import chat_limiter

    chat_limiter.hits.clear()
    with TestClient(app) as c:
        yield c


def register(client, email=None):
    email = email or f"u{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/register", json={"name": "Test", "email": email, "password": "supersecret"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_parse_budget_and_clean_query():
    assert parse_budget("best laptop under ₹1 lakh") == 100_000
    assert parse_budget("phone below 25k") == 25_000
    assert parse_budget("shoes under rs 3,499") == 3499
    assert parse_budget("a nice lamp") is None
    assert clean_query("Best AI laptop under ₹50,000 for coding") == "ai laptop coding"


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["mode"] == "demo" and body["database"] == "in-memory"


def test_chat_search_with_budget_and_insights(client):
    r = client.post("/api/chat", json={"message": "best laptop under 50000", "session_id": str(uuid.uuid4())})
    assert r.status_code == 200, r.text
    data = r.json()
    names = [p["name"] for p in data["products"]]
    assert set(names) == {"Alpha Laptop", "Gamma Laptop"}  # Beta is over budget
    assert all(p["insight"]["pros"] for p in data["products"])
    assert data["route"] == "search" and data["provider"] == "demo"
    assert "Demo mode" in data["text"]


def test_chat_stream_emits_events(client):
    with client.stream("POST", "/api/chat/stream", json={"message": "laptop", "session_id": str(uuid.uuid4())}) as r:
        body = "".join(r.iter_text())
    for ev in ("event: status", "event: products", "event: token", "event: done"):
        assert ev in body


def test_smalltalk_and_image_without_ai(client):
    r = client.post("/api/chat", json={"message": "hi"}).json()
    assert r["route"] == "smalltalk" and "AuraBuy" in r["text"]
    r = client.post("/api/chat", json={"message": "find this", "image": "data:image/png;base64,AAAA"}).json()
    assert r["route"] == "no_ai_image"


def test_auth_flow(client):
    email = f"x{uuid.uuid4().hex[:6]}@example.com"
    headers = register(client, email)
    assert client.get("/api/auth/me", headers=headers).json()["email"] == email
    assert client.post("/api/auth/register", json={"name": "A", "email": email, "password": "supersecret"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": email, "password": "wrongpass"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "supersecret"}).status_code == 200
    assert client.get("/api/wishlist").status_code == 401


def test_wishlist_crud_and_sync(client):
    h = register(client)
    p = CATALOG[0].model_dump()
    assert client.post("/api/wishlist", json=p, headers=h).status_code == 201
    assert client.post("/api/wishlist", json=p, headers=h).status_code == 201  # idempotent
    r = client.post("/api/wishlist/sync", json=[CATALOG[1].model_dump()], headers=h)
    assert len(r.json()) == 2
    assert client.delete(f"/api/wishlist/{p['id']}", headers=h).status_code == 204
    assert [i["product"]["name"] for i in client.get("/api/wishlist", headers=h).json()] == ["Beta Laptop"]


def test_price_alerts(client):
    h = register(client)
    r = client.post("/api/alerts", json={"product": CATALOG[0].model_dump(), "target_price": 40000}, headers=h)
    assert r.status_code == 201 and r.json()["triggered"] is False
    alert_id = r.json()["id"]
    r = client.patch(f"/api/alerts/{alert_id}", json={"target_price": 46000}, headers=h)
    assert r.json()["triggered"] is True
    assert len(client.post("/api/alerts/check", headers=h).json()) == 1
    assert client.delete(f"/api/alerts/{alert_id}", headers=h).status_code == 204
    assert client.get("/api/alerts", headers=h).json() == []


def test_compare_rule_based(client):
    r = client.post("/api/products/compare", json={"products": [p.model_dump() for p in CATALOG]})
    assert r.status_code == 200
    data = r.json()
    price_row = next(row for row in data["rows"] if row["label"] == "Price")
    assert price_row["winner"] == 2  # Gamma is cheapest
    assert data["verdict"] and data["ai"] is False


def test_conversations_are_private(client):
    h1, h2 = register(client), register(client)
    sid = str(uuid.uuid4())
    client.post("/api/chat", json={"message": "laptop", "session_id": sid}, headers=h1)
    assert [c["id"] for c in client.get("/api/conversations", headers=h1).json()] == [sid]
    assert client.get(f"/api/conversations/{sid}", headers=h2).status_code == 404
    r = client.post("/api/chat", json={"message": "laptop", "session_id": sid}, headers=h2)
    assert r.status_code == 400 or "another account" in r.text
