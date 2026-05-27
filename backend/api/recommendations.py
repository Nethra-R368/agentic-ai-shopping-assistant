from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class RecRequest(BaseModel):
    query: str
    budget: float = None

@router.post("/")
async def get_recommendations(req: RecRequest):
    """
    Endpoint for Explainable AI Recommendations.
    In future phases, this will use FAISS for semantic search and Gemini to explain why.
    """
    try:
        return {
            "query": req.query,
            "message": "Explainable recommendations will be integrated here using FAISS and Gemini.",
            "recommendations": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
