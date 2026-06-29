"""
SwiftCart — AI Recommendation Microservice (Phase 2 Skeleton)
FastAPI service for collaborative filtering upsell recommendations.

This is a placeholder that returns rule-based fallback recommendations.
Phase 2 will add:
  - Item-based collaborative filtering trained on aggregated cart data
  - A/B test mode: rule-based vs AI recommendations
  - Model retraining pipeline
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import random

app = FastAPI(
    title="SwiftCart AI Recommendations",
    description="AI-powered upsell recommendation engine for SwiftCart",
    version="0.1.0",
)

# CORS for storefront widget requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class CartItem(BaseModel):
    product_id: str
    variant_id: str
    quantity: int
    price: float
    title: str
    tags: Optional[list[str]] = []


class RecommendRequest(BaseModel):
    shop_domain: str
    cart_items: list[CartItem]
    customer_id: Optional[str] = None
    limit: int = 6


class RecommendedProduct(BaseModel):
    product_id: str
    title: str
    price: float
    image_url: str
    confidence: float  # 0.0 - 1.0
    reason: str


class RecommendResponse(BaseModel):
    recommendations: list[RecommendedProduct]
    model_version: str
    method: str  # "rule_based" | "collaborative_filtering"


@app.get("/health")
async def health():
    return {"status": "ok", "service": "swiftcart-ai", "version": "0.1.0"}


@app.post("/ai/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    """
    Generate upsell product recommendations for a given cart state.

    Phase 1 (current): Returns placeholder recommendations.
    Phase 2: Will use collaborative filtering model.
    """
    if not req.cart_items:
        return RecommendResponse(
            recommendations=[],
            model_version="0.1.0-placeholder",
            method="rule_based",
        )

    # Phase 1: Placeholder logic
    # In production, this will query the trained model
    placeholder_recs = [
        RecommendedProduct(
            product_id=f"placeholder_{i}",
            title=f"Recommended Product {i + 1}",
            price=round(random.uniform(199, 1999), 2),
            image_url="",
            confidence=round(random.uniform(0.5, 0.95), 2),
            reason="Based on similar cart patterns",
        )
        for i in range(min(req.limit, 6))
    ]

    return RecommendResponse(
        recommendations=placeholder_recs,
        model_version="0.1.0-placeholder",
        method="rule_based",
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
