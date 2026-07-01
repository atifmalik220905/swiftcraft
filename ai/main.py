"""
SwiftCart — AI Recommendation Microservice
FastAPI service for collaborative filtering upsell recommendations.

This service provides:
  - Rule-based fallback recommendations (v1)
  - AI-powered collaborative filtering (v2)
  - Rate limiting and caching
  - Comprehensive error handling
  - Health monitoring

Architecture:
  - Phase 1: Rule-based recommendations with caching
  - Phase 2: Item-based collaborative filtering model
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
import hashlib
import time
import os
import json
from datetime import datetime, timezone
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("swiftcart-ai")

# Environment configuration
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "1.0.0")
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "300"))  # 5 minutes
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

app = FastAPI(
    title="SwiftCart AI Recommendations",
    description="AI-powered upsell recommendation engine for SwiftCart",
    version=SERVICE_VERSION,
    docs_url="/docs" if DEBUG_MODE else None,
    redoc_url="/redoc" if DEBUG_MODE else None,
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=86400,  # 24 hours
)


# ─────────────────────────────────────────────────────────────────────────
# Request/Response Models with Pydantic v2
# ─────────────────────────────────────────────────────────────────────────

class CartItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    product_id: str = Field(..., min_length=1, max_length=100)
    variant_id: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(1, ge=1, le=100)
    price: float = Field(..., ge=0, le=1000000)  # Max ₹10,00,000
    title: str = Field("", max_length=500)
    tags: Optional[list[str]] = Field(default_factory=list, max_length=50)

    @field_validator('price')
    @classmethod
    def validate_price(cls, v: float) -> float:
        return round(v, 2)


class RecommendRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    shop_domain: str = Field(..., min_length=1, max_length=255)
    cart_items: list[CartItem] = Field(..., max_length=100)
    customer_id: Optional[str] = Field(None, max_length=100)
    limit: int = Field(6, ge=1, le=20)
    session_id: Optional[str] = Field(None, max_length=100)
    device_type: Optional[str] = Field("desktop", pattern="^(mobile|desktop|tablet)$")

    @field_validator('shop_domain')
    @classmethod
    def validate_shop_domain(cls, v: str) -> str:
        if not v.endswith('.myshopify.com'):
            raise ValueError('shop_domain must end with .myshopify.com')
        return v.lower()


class RecommendedProduct(BaseModel):
    product_id: str
    title: str
    price: float
    image_url: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str
    variant_id: Optional[str] = None


class RecommendResponse(BaseModel):
    recommendations: list[RecommendedProduct]
    model_version: str
    method: str  # "rule_based" | "collaborative_filtering"
    processing_time_ms: float
    cache_hit: bool = False


class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[dict] = None
    request_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    uptime_seconds: float
    checks: dict


# ─────────────────────────────────────────────────────────────────────────
# In-Memory Rate Limiting (Replace with Redis in production)
# ─────────────────────────────────────────────────────────────────────────

class RateLimiter:
    """Simple in-memory rate limiter. Replace with Redis in production."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, list[float]] = {}

    def is_allowed(self, key: str) -> tuple[bool, int]:
        """Check if request is allowed. Returns (allowed, retry_after_seconds)."""
        now = time.time()
        window_start = now - 60

        # Get existing requests for this key
        requests = self._requests.get(key, [])

        # Filter to only requests in the current window
        valid_requests = [t for t in requests if t > window_start]

        if len(valid_requests) >= self.requests_per_minute:
            oldest = min(valid_requests)
            retry_after = int(oldest + 60 - now) + 1
            return False, retry_after

        # Add this request
        valid_requests.append(now)
        self._requests[key] = valid_requests

        return True, 0


rate_limiter = RateLimiter(RATE_LIMIT_PER_MINUTE)


# ─────────────────────────────────────────────────────────────────────────
# Request ID Middleware
# ─────────────────────────────────────────────────────────────────────────

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID for tracing."""
    request_id = request.headers.get("X-Request-ID") or hashlib.sha256(
        f"{time.time()}{request.client.host}".encode()
    ).hexdigest()[:16]

    # Add to request state
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limit requests per shop domain."""
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path == "/health":
        return await call_next(request)

    # Extract shop domain from request body for POST requests
    rate_key = "global"
    if request.method == "POST":
        try:
            body = await request.json()
            if "shop_domain" in body:
                rate_key = body["shop_domain"]
        except:
            pass

    allowed, retry_after = rate_limiter.is_allowed(rate_key)

    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "code": "RATE_LIMIT",
                "retry_after": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )

    return await call_next(request)


# ─────────────────────────────────────────────────────────────────────────
# Caching Layer
# ─────────────────────────────────────────────────────────────────────────

class CacheEntry:
    """Simple cache entry with TTL."""
    def __init__(self, data: any, ttl_seconds: int):
        self.data = data
        self.expires_at = time.time() + ttl_seconds

    def is_valid(self) -> bool:
        return time.time() < self.expires_at


class RecommendationCache:
    """In-memory cache for recommendations. Replace with Redis in production."""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, CacheEntry] = {}

    def _make_key(self, shop_domain: str, cart_hash: str, limit: int) -> str:
        return f"{shop_domain}:{cart_hash}:{limit}"

    def get(self, shop_domain: str, cart_items: list, limit: int) -> Optional[list]:
        """Get cached recommendations if valid."""
        cart_hash = self._hash_cart(cart_items)
        key = self._make_key(shop_domain, cart_hash, limit)

        entry = self._cache.get(key)
        if entry and entry.is_valid():
            return entry.data
        return None

    def set(self, shop_domain: str, cart_items: list, limit: int, recommendations: list):
        """Cache recommendations."""
        cart_hash = self._hash_cart(cart_items)
        key = self._make_key(shop_domain, cart_hash, limit)
        self._cache[key] = CacheEntry(recommendations, self.ttl_seconds)

    @staticmethod
    def _hash_cart(cart_items: list) -> str:
        """Create deterministic hash of cart contents."""
        cart_str = json.dumps(
            [{"id": i.product_id, "q": i.quantity} for i in cart_items],
            sort_keys=True
        )
        return hashlib.sha256(cart_str.encode()).hexdigest()[:16]


recommendation_cache = RecommendationCache(CACHE_TTL_SECONDS)


# ─────────────────────────────────────────────────────────────────────────
# Recommendation Engine
# ─────────────────────────────────────────────────────────────────────────

class RecommendationEngine:
    """
    SwiftCart Recommendation Engine.

    Phase 1: Rule-based fallback recommendations
    Phase 2: Collaborative filtering model
    """

    VERSION = "1.0.0"

    # Fallback product database (replace with Shopify API calls in production)
    # These are example products - in production, fetch from Shopify Admin API
    FALLBACK_PRODUCTS = [
        {
            "product_id": "gid://shopify/Product/sc-rec-001",
            "title": "Nourishing Face Cream",
            "price": 599.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-001.jpg",
            "confidence": 0.85,
            "reason": "Perfect for daily skincare routine"
        },
        {
            "product_id": "gid://shopify/Product/sc-rec-002",
            "title": "Vitamin C Serum",
            "price": 799.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-002.jpg",
            "confidence": 0.82,
            "reason": "Popular alongside your selection"
        },
        {
            "product_id": "gid://shopify/Product/sc-rec-003",
            "title": "Hydrating Lip Balm",
            "price": 199.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-003.jpg",
            "confidence": 0.78,
            "reason": "Customers also bought"
        },
        {
            "product_id": "gid://shopify/Product/sc-rec-004",
            "title": "SPF 50 Sunscreen",
            "price": 449.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-004.jpg",
            "confidence": 0.75,
            "reason": "Essential sun protection"
        },
        {
            "product_id": "gid://shopify/Product/sc-rec-005",
            "title": "Gentle Face Wash",
            "price": 349.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-005.jpg",
            "confidence": 0.72,
            "reason": "Completes your routine"
        },
        {
            "product_id": "gid://shopify/Product/sc-rec-006",
            "title": "Overnight Face Mask",
            "price": 699.00,
            "image_url": "https://cdn.shopify.com/s/files/1/placeholder-006.jpg",
            "confidence": 0.68,
            "reason": "Trending this week"
        },
    ]

    def generate_recommendations(
        self,
        cart_items: list[CartItem],
        customer_id: Optional[str] = None,
        limit: int = 6,
    ) -> list[RecommendedProduct]:
        """
        Generate product recommendations.

        Phase 1: Returns curated fallback products
        Phase 2: Will use collaborative filtering model
        """
        if not cart_items:
            return []

        # Extract signals from cart
        cart_product_ids = {item.product_id for item in cart_items}
        cart_value = sum(item.price * item.quantity for item in cart_items)
        cart_tags = set()
        for item in cart_items:
            if item.tags:
                cart_tags.update(item.tags)

        # Phase 1: Return fallback products (excluding items already in cart)
        recommendations = []
        for product in self.FALLBACK_PRODUCTS:
            if product["product_id"] not in cart_product_ids:
                # Adjust confidence based on cart context
                confidence = product["confidence"]

                # Boost confidence for complementary products
                if cart_tags and self._is_complementary(product["title"], cart_tags):
                    confidence = min(1.0, confidence + 0.1)

                # Boost confidence for high-value carts
                if cart_value > 1500:
                    confidence = min(1.0, confidence + 0.05)

                recommendations.append(RecommendedProduct(
                    product_id=product["product_id"],
                    title=product["title"],
                    price=product["price"],
                    image_url=product["image_url"],
                    confidence=round(confidence, 2),
                    reason=product["reason"],
                    variant_id=None,
                ))

                if len(recommendations) >= limit:
                    break

        return recommendations

    def _is_complementary(self, product_title: str, cart_tags: set) -> bool:
        """Check if product is complementary to cart items based on tags."""
        tag_lower = {t.lower() for t in cart_tags}

        # Simple heuristic - in production, use ML model
        if "skincare" in tag_lower and "cream" in product_title.lower():
            return True
        if "haircare" in tag_lower and "serum" in product_title.lower():
            return True
        if "wellness" in tag_lower:
            return True

        return False


recommendation_engine = RecommendationEngine()


# ─────────────────────────────────────────────────────────────────────────
# Service Uptime Tracking
# ─────────────────────────────────────────────────────────────────────────

SERVICE_START_TIME = time.time()


# ─────────────────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint for monitoring."""
    uptime = time.time() - SERVICE_START_TIME

    return HealthResponse(
        status="ok",
        service="swiftcart-ai",
        version=SERVICE_VERSION,
        uptime_seconds=round(uptime, 2),
        checks={
            "cache": "ok",
            "rate_limiter": "ok",
            "recommendation_engine": "ok",
        }
    )


@app.get("/ready")
async def ready():
    """Readiness check for Kubernetes/container orchestration."""
    # In production, check database connections, external services, etc.
    return {"status": "ready"}


@app.post("/ai/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest, http_request: Request):
    """
    Generate upsell product recommendations for a given cart state.

    This endpoint:
    1. Validates the incoming request
    2. Checks cache for existing recommendations
    3. Generates new recommendations if needed
    4. Returns ranked product suggestions

    Phase 1 (current): Returns curated placeholder recommendations.
    Phase 2: Will use collaborative filtering model trained on merchant data.
    """
    start_time = time.time()
    request_id = getattr(http_request.state, "request_id", "unknown")

    # Empty cart check
    if not request.cart_items:
        return RecommendResponse(
            recommendations=[],
            model_version=f"{SERVICE_VERSION}-placeholder",
            method="rule_based",
            processing_time_ms=0,
            cache_hit=False,
        )

    # Check cache
    cached = recommendation_cache.get(
        request.shop_domain,
        request.cart_items,
        request.limit
    )

    if cached:
        processing_time = (time.time() - start_time) * 1000
        logger.info(
            f"[{request_id}] Cache hit for {request.shop_domain} "
            f"({processing_time:.2f}ms)"
        )
        return RecommendResponse(
            recommendations=cached,
            model_version=f"{SERVICE_VERSION}-cached",
            method="rule_based",
            processing_time_ms=round(processing_time, 2),
            cache_hit=True,
        )

    # Generate recommendations
    recommendations = recommendation_engine.generate_recommendations(
        cart_items=request.cart_items,
        customer_id=request.customer_id,
        limit=request.limit,
    )

    # Cache the results
    if recommendations:
        recommendation_cache.set(
            request.shop_domain,
            request.cart_items,
            request.limit,
            recommendations
        )

    processing_time = (time.time() - start_time) * 1000

    logger.info(
        f"[{request_id}] Generated {len(recommendations)} recommendations "
        f"for {request.shop_domain} ({processing_time:.2f}ms)"
    )

    return RecommendResponse(
        recommendations=recommendations,
        model_version=f"{SERVICE_VERSION}-placeholder",
        method="rule_based",
        processing_time_ms=round(processing_time, 2),
        cache_hit=False,
    )


@app.post("/ai/recommend/batch")
async def recommend_batch(requests: list[RecommendRequest]):
    """
    Batch recommendation endpoint for high-volume processing.
    Maximum 10 requests per batch.
    """
    if len(requests) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 requests per batch"
        )

    results = []
    for req in requests:
        recommendations = recommendation_engine.generate_recommendations(
            cart_items=req.cart_items,
            customer_id=req.customer_id,
            limit=req.limit,
        )
        results.append({
            "shop_domain": req.shop_domain,
            "recommendations": [r.model_dump() for r in recommendations],
        })

    return {"results": results}


@app.post("/ai/feedback")
async def submit_feedback(
    session_id: str,
    product_id: str,
    action: str,
    http_request: Request
):
    """
    Submit user feedback for recommendation quality tracking.

    Actions: "clicked", "added", "dismissed"
    """
    request_id = getattr(http_request.state, "request_id", "unknown")

    if action not in ("clicked", "added", "dismissed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be: clicked, added, dismissed"
        )

    # In production, store in analytics database
    logger.info(
        f"[{request_id}] Feedback: session={session_id}, "
        f"product={product_id}, action={action}"
    )

    return {"status": "recorded", "action": action}


@app.delete("/ai/cache/{shop_domain}")
async def clear_cache(shop_domain: str, http_request: Request):
    """Clear cached recommendations for a shop (admin only)."""
    request_id = getattr(http_request.state, "request_id", "unknown")

    # In production, verify admin auth
    cleared = 0
    keys_to_remove = [
        k for k in recommendation_cache._cache.keys()
        if k.startswith(f"{shop_domain}:")
    ]

    for key in keys_to_remove:
        del recommendation_cache._cache[key]
        cleared += 1

    logger.info(f"[{request_id}] Cleared {cleared} cache entries for {shop_domain}")

    return {"status": "cleared", "entries_removed": cleared}


# ─────────────────────────────────────────────────────────────────────────
# Exception Handlers
# ─────────────────────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Standardize HTTP error responses."""
    request_id = getattr(request.state, "request_id", "unknown")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "request_id": request_id,
        }
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation errors."""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.warning(f"[{request_id}] Validation error: {str(exc)}")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": str(exc),
            "code": "VALIDATION_ERROR",
            "request_id": request_id,
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler."""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.error(f"[{request_id}] Unhandled exception: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "code": "INTERNAL_ERROR",
            "request_id": request_id,
        }
    )


# ─────────────────────────────────────────────────────────────────────────
# Metrics Endpoint (for Prometheus scraping)
# ─────────────────────────────────────────────────────────────────────────

@app.get("/metrics")
async def metrics():
    """Prometheus-compatible metrics endpoint."""
    uptime = time.time() - SERVICE_START_TIME

    # In production, use prometheus_client library
    return {
        "swiftcart_ai_uptime_seconds": uptime,
        "swiftcart_ai_cache_size": len(recommendation_cache._cache),
        "swiftcart_ai_rate_limit_tracked_keys": len(rate_limiter._requests),
        "swiftcart_ai_version": SERVICE_VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    workers = int(os.getenv("WORKERS", "1"))

    logger.info(f"Starting SwiftCart AI v{SERVICE_VERSION} on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=workers,
        log_level="info",
        access_log=True,
    )
