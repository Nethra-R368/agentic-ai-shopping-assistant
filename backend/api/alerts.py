import time
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from database.mongodb import get_database
from models.schemas import Alert, AlertCreate, Product
from services.search import refresh_price

router = APIRouter()


def to_alert(d: dict) -> Alert:
    return Alert(
        id=str(d["_id"]), product=Product(**d["product"]), target_price=d["target_price"],
        current_price=d["current_price"], lowest_price=d["lowest_price"], triggered=d["triggered"],
        created_at=d["created_at"], last_checked=d["last_checked"], history=d.get("history", [])[-30:],
    )


@router.get("", response_model=List[Alert])
async def list_alerts(user: dict = Depends(get_current_user)):
    docs = await get_database().alerts.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(100)
    return [to_alert(d) for d in docs]


@router.post("", response_model=Alert, status_code=201)
async def create_alert(body: AlertCreate, user: dict = Depends(get_current_user)):
    now = time.time()
    price = body.product.price
    doc = {
        "user_id": user["_id"], "product": body.product.model_dump(), "target_price": body.target_price,
        "current_price": price, "lowest_price": price, "triggered": 0 < price <= body.target_price,
        "created_at": now, "last_checked": now, "history": [{"ts": now, "price": price}],
    }
    doc["_id"] = (await get_database().alerts.insert_one(doc)).inserted_id
    return to_alert(doc)


async def _check(doc: dict) -> dict:
    price = await refresh_price(Product(**doc["product"]))
    now = time.time()
    update = {"last_checked": now}
    if price:
        update.update({
            "current_price": price,
            "lowest_price": min(doc["lowest_price"], price),
            "triggered": price <= doc["target_price"],
        })
        doc.setdefault("history", []).append({"ts": now, "price": price})
        update["history"] = doc["history"][-60:]
    await get_database().alerts.update_one({"_id": doc["_id"]}, {"$set": update})
    doc.update(update)
    return doc


@router.post("/check", response_model=List[Alert])
async def check_all_alerts(user: dict = Depends(get_current_user)):
    docs = await get_database().alerts.find({"user_id": user["_id"]}).to_list(100)
    return [to_alert(await _check(d)) for d in docs]


@router.patch("/{alert_id}", response_model=Alert)
async def update_alert_target(alert_id: str, body: dict, user: dict = Depends(get_current_user)):
    target = float(body.get("target_price") or 0)
    if not ObjectId.is_valid(alert_id) or target <= 0:
        raise HTTPException(status_code=400, detail="Invalid alert or target price.")
    db = get_database()
    doc = await db.alerts.find_one({"_id": ObjectId(alert_id), "user_id": user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found.")
    triggered = 0 < doc["current_price"] <= target
    await db.alerts.update_one({"_id": doc["_id"]}, {"$set": {"target_price": target, "triggered": triggered}})
    doc.update(target_price=target, triggered=triggered)
    return to_alert(doc)


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(alert_id: str, user: dict = Depends(get_current_user)):
    if ObjectId.is_valid(alert_id):
        await get_database().alerts.delete_one({"_id": ObjectId(alert_id), "user_id": user["_id"]})
