/**
 * SwiftCart — Cart Evaluation API
 * POST /api/cart/evaluate
 *
 * Accepts cart state from the storefront widget, evaluates all active
 * rules for the merchant, and returns upsell products, milestone status,
 * and fraud signals.
 *
 * Performance Target: P95 < 200ms
 */

import prisma from "../db.server";
import {
  evaluateUpsellRules,
  evaluateProgressBar,
  evaluateFreeGifts,
  evaluateFraudSignals,
} from "../utils/rules-evaluator";
import {
  validateShopDomain,
  validateSessionId,
  validateDeviceType,
  sanitizeString,
  validationErrorResponse,
} from "../utils/validation";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "../utils/rate-limiter";
import {
  cacheGet,
  cacheSet,
  cacheGetOrCompute,
  merchantConfigKey,
  cartEvaluationKey,
  hashCart,
} from "../utils/cache";

// Cache TTLs
const MERCHANT_CONFIG_TTL_MS = 30000; // 30 seconds
const CART_EVAL_TTL_MS = 5000; // 5 seconds (for rapid successive requests)

// ─── Response Helpers ───

const json = (data, init = {}) => {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // Add CORS headers for storefront widget
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  });
};

const errorResponse = (message, code, status = 400) => {
  return json({ error: message, code }, { status });
};

// ─── Request Validation Schema ───

const MAX_CART_ITEMS = 100;
const MAX_PINCODE_LENGTH = 10;
const MAX_CITY_LENGTH = 100;

function validateCartRequest(body) {
  const errors = [];

  // Validate shop domain
  const shopValidation = validateShopDomain(body.shopDomain);
  if (!shopValidation.valid) {
    errors.push({ field: "shopDomain", message: shopValidation.error });
  }

  // Validate cart structure
  if (!body.cart) {
    errors.push({ field: "cart", message: "Cart data is required" });
  } else {
    if (!Array.isArray(body.cart.items)) {
      errors.push({ field: "cart.items", message: "Cart items must be an array" });
    } else if (body.cart.items.length > MAX_CART_ITEMS) {
      errors.push({ field: "cart.items", message: `Maximum ${MAX_CART_ITEMS} items allowed` });
    }

    if (typeof body.cart.total_price !== 'number' || body.cart.total_price < 0) {
      errors.push({ field: "cart.total_price", message: "Invalid cart total" });
    }
  }

  // Validate session ID (optional, but validate format if present)
  if (body.sessionId) {
    const sessionValidation = validateSessionId(body.sessionId);
    if (!sessionValidation.valid) {
      // Non-blocking - use default
      body.sessionId = "unknown";
    }
  }

  // Validate device type (optional)
  const deviceValidation = validateDeviceType(body.deviceType);
  body.deviceType = deviceValidation.value;

  // Sanitize optional fields
  if (body.customerCity) {
    body.customerCity = sanitizeString(body.customerCity, { maxLength: MAX_CITY_LENGTH });
  }

  if (body.pincode) {
    body.pincode = sanitizeString(body.pincode.toString(), { maxLength: MAX_PINCODE_LENGTH, allowNewlines: false });
  }

  return { valid: errors.length === 0, errors, normalizedData: body };
}

export const action = async ({ request }) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return json(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return errorResponse("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errorResponse("Invalid JSON body", "INVALID_JSON", 400);
  }

  // Validate request
  const validation = validateCartRequest(body);
  if (!validation.valid) {
    return json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: validation.errors,
    }, { status: 400 });
  }

  const { shopDomain, sessionId, cart, deviceType, customerCity, pincode } = validation.normalizedData;

  // Rate limit by shop domain
  const rateLimitKey = `shop:${shopDomain}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.CART_EVALUATE);
  if (!rateLimit.allowed) {
    return json({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT",
      retryAfter: rateLimit.retryAfter,
    }, { status: 429, headers: rateLimit.headers });
  }

  // Check cache for identical cart evaluation (rapid successive requests)
  const cartHash = hashCart(cart);
  const evalCacheKey = cartEvaluationKey(shopDomain, cartHash);
  const cachedEval = await cacheGet(evalCacheKey);
  if (cachedEval) {
    return json({
      ...cachedEval,
      _meta: { ...cachedEval._meta, cached: true, processingTimeMs: Date.now() - startTime },
    }, { headers: rateLimit.headers });
  }

  try {
    // Get merchant config with caching
    const configCacheKey = merchantConfigKey(shopDomain);
    const merchant = await cacheGetOrCompute(
      configCacheKey,
      async () => {
        return prisma.merchant.findUnique({
          where: { shopDomain },
          select: {
            id: true,
            planTier: true,
            isActive: true,
            cartSettings: {
              select: {
                showProgressBar: true,
                showUpsells: true,
                showFreeGifts: true,
                showCountdown: true,
                showLowStock: true,
                showSocialProof: true,
              },
            },
            upsellRules: {
              where: { isActive: true },
              orderBy: { priority: "asc" },
              take: 20,
              select: {
                id: true,
                triggerType: true,
                triggerValue: true,
                upsellProductIds: true,
                displayType: true,
                priority: true,
              },
            },
            progressBarRules: {
              where: { isActive: true },
              orderBy: { milestoneOrder: "asc" },
              select: {
                milestoneOrder: true,
                rewardType: true,
                thresholdAmount: true,
                messageBefore: true,
                messageAfter: true,
                rewardValue: true,
                barFillColor: true,
                barBgColor: true,
                showShimmer: true,
              },
            },
            freeGiftRules: {
              where: { isActive: true },
              select: {
                giftProductId: true,
                giftProductTitle: true,
                thresholdAmount: true,
                allowChoice: true,
                choiceCollectionId: true,
              },
            },
            fraudSettings: {
              select: {
                enablePincodeBlock: true,
                blockedPincodes: true,
                enableCodOtp: true,
                codOtpThreshold: true,
                hideCodAbove: true,
                enableAddressCheck: true,
              },
            },
            _count: {
              select: { upsellRules: true, freeGiftRules: true },
            },
          },
        });
      },
      MERCHANT_CONFIG_TTL_MS
    );

    if (!merchant) {
      return errorResponse("Merchant not found", "MERCHANT_NOT_FOUND", 404);
    }

    if (!merchant.isActive) {
      return errorResponse("Merchant account is inactive", "MERCHANT_INACTIVE", 403);
    }

    // Check plan limits
    const planLimits = getPlanLimits(merchant.planTier);

    // Cart total in currency (Shopify cart.js returns cents)
    const cartTotal = Math.max(0, (cart.total_price || 0) / 100);
    const cartItems = cart.items || [];

    // Early return for empty cart
    if (cartItems.length === 0) {
      return json({
        upsells: [],
        milestones: [],
        gifts: { giftsToAdd: [], giftsToRemove: [] },
        fraud: { warnings: [], blockCod: false, requireOtp: false },
        settings: {
          showProgressBar: merchant.cartSettings?.showProgressBar ?? true,
          showUpsells: false,
          showFreeGifts: false,
          showCountdown: merchant.cartSettings?.showCountdown ?? false,
          showLowStock: false,
          showSocialProof: false,
        },
        _meta: { processingTimeMs: Date.now() - startTime },
      });
    }

    // Augment cart with extra context
    const augmentedCart = { ...cart, _customerCity: customerCity || '' };

    // 1. Evaluate upsell rules (respect plan limits)
    const limitedRules = merchant.upsellRules.slice(0, planLimits.maxUpsellRules);
    const upsellMatches = evaluateUpsellRules(limitedRules, augmentedCart);

    // Collect unique product IDs from all matched rules
    const allUpsellProductIds = [];
    for (const match of upsellMatches) {
      for (const pid of match.productIds) {
        if (!allUpsellProductIds.includes(pid)) {
          allUpsellProductIds.push(pid);
        }
      }
    }

    // Limit to 6 upsells for display
    const upsells = allUpsellProductIds.slice(0, 6).map((pid) => ({
      productId: pid,
      title: "Recommended Product",
      price: 0,
      image: "",
      variantId: pid,
    }));

    // 2. Evaluate progress bar milestones
    const milestones = evaluateProgressBar(merchant.progressBarRules, cartTotal);

    // 3. Evaluate free gifts
    const limitedGifts = merchant.freeGiftRules.slice(0, planLimits.maxGiftRules);
    const giftStatus = evaluateFreeGifts(limitedGifts, cartTotal, cartItems);

    // 4. Evaluate fraud signals
    const fraudResult = evaluateFraudSignals(merchant.fraudSettings, {
      pincode: pincode || '',
      cartTotal,
      paymentMethod: 'cod',
    });

    // 5. Log analytics event (async, non-blocking)
    logCartEvent(merchant.id, sessionId, cartTotal, deviceType).catch((e) => {
      console.warn("[SwiftCart] Failed to log cart event:", e.message);
    });

    const processingTime = Date.now() - startTime;

    // Log slow requests for monitoring
    if (processingTime > 200) {
      console.warn(`[SwiftCart] Slow cart evaluation: ${processingTime}ms for ${shopDomain}`);
    }

    const responsePayload = {
      upsells,
      milestones,
      gifts: giftStatus,
      fraud: fraudResult,
      settings: {
        showProgressBar: merchant.cartSettings?.showProgressBar ?? true,
        showUpsells: merchant.cartSettings?.showUpsells ?? true,
        showFreeGifts: merchant.cartSettings?.showFreeGifts ?? true,
        showCountdown: merchant.cartSettings?.showCountdown ?? false,
        showLowStock: merchant.cartSettings?.showLowStock ?? true,
        showSocialProof: merchant.cartSettings?.showSocialProof ?? false,
      },
      _meta: {
        processingTimeMs: processingTime,
        planTier: merchant.planTier,
      },
    };

    // Cache the evaluation for rapid successive requests
    await cacheSet(evalCacheKey, responsePayload, CART_EVAL_TTL_MS);

    return json(responsePayload, { headers: rateLimit.headers });
  } catch (error) {
    console.error("[SwiftCart] Cart evaluation error:", error);

    // Return graceful fallback instead of error
    return json({
      upsells: [],
      milestones: [],
      gifts: { giftsToAdd: [], giftsToRemove: [] },
      fraud: { warnings: [], blockCod: false, requireOtp: false },
      settings: {
        showProgressBar: true,
        showUpsells: true,
        showFreeGifts: true,
        showCountdown: false,
        showLowStock: true,
        showSocialProof: false,
      },
      _meta: { processingTimeMs: Date.now() - startTime },
      _error: "Evaluation failed, returning defaults",
    }, { status: 200 }); // Return 200 to not break storefront
  }
};

// ─── Plan Limits ───
function getPlanLimits(planTier) {
  const limits = {
    starter: { maxUpsellRules: 3, maxGiftRules: 1, hasAI: false, hasVolumeDiscount: false },
    growth: { maxUpsellRules: 10, maxGiftRules: 3, hasAI: false, hasVolumeDiscount: true },
    scale: { maxUpsellRules: 999, maxGiftRules: 999, hasAI: true, hasVolumeDiscount: true },
    enterprise: { maxUpsellRules: 999, maxGiftRules: 999, hasAI: true, hasVolumeDiscount: true },
  };
  return limits[planTier] || limits.starter;
}

// ─── Log Cart Event ───
async function logCartEvent(merchantId, sessionId, cartTotal, deviceType) {
  try {
    await prisma.cartEvent.create({
      data: {
        merchantId,
        sessionId: sessionId || 'unknown',
        eventType: 'cart_open',
        cartValueBefore: cartTotal,
        cartValueAfter: cartTotal,
        deviceType: deviceType || 'desktop',
      },
    });
  } catch (e) {
    // Non-critical — don't fail the response
    console.warn("[SwiftCart] Failed to log cart event:", e.message);
  }
}

// Handle GET with a simple health check
export const loader = async () => {
  return json({ status: "ok", service: "SwiftCart Cart Evaluation API" });
};
