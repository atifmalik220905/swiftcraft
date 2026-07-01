/**
 * SwiftCart — Cart Event Tracking API
 * POST /api/cart/event
 *
 * Receives analytics events from the storefront widget and persists
 * them for the merchant analytics dashboard.
 */

import prisma from "../db.server";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "../utils/rate-limiter";
import { validateShopDomain, validateEventType, validateDeviceType, sanitizeString } from "../utils/validation";

const json = (data, init = {}) => {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  });
};

// Handle CORS preflight
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return json(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body", code: "INVALID_JSON" }, { status: 400 });
  }

  // Validate shop domain
  const shopValidation = validateShopDomain(body.shopDomain);
  if (!shopValidation.valid) {
    return json({ error: shopValidation.error, code: "INVALID_SHOP" }, { status: 400 });
  }
  const shopDomain = shopValidation.normalized;

  // Rate limit by shop domain
  const rateLimitKey = `shop:${shopDomain}`;
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMIT_PRESETS.CART_EVENT);
  if (!rateLimit.allowed) {
    return json({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT",
      retryAfter: rateLimit.retryAfter,
    }, { status: 429, headers: rateLimit.headers });
  }

  // Validate event type
  const eventValidation = validateEventType(body.eventType);
  if (!eventValidation.valid) {
    return json({ error: eventValidation.error, code: "INVALID_EVENT_TYPE" }, { status: 400 });
  }

  const deviceValidation = validateDeviceType(body.deviceType);

  try {
    // Find merchant
    const merchant = await prisma.merchant.findUnique({
      where: { shopDomain },
      select: { id: true, isActive: true },
    });

    if (!merchant || !merchant.isActive) {
      return json({ error: "Merchant not found", code: "MERCHANT_NOT_FOUND" }, { status: 404 });
    }

    // Create event record
    await prisma.cartEvent.create({
      data: {
        merchantId: merchant.id,
        sessionId: sanitizeString(body.sessionId || "unknown", { maxLength: 100 }),
        eventType: eventValidation.value,
        cartValueBefore: body.cartValueBefore ? body.cartValueBefore / 100 : 0,
        cartValueAfter: body.cartValueAfter ? body.cartValueAfter / 100 : 0,
        upsellRuleId: body.upsellRuleId || null,
        deviceType: deviceValidation.value,
      },
    });

    return json({ success: true }, { headers: rateLimit.headers });
  } catch (error) {
    console.error("[SwiftCart] Event tracking error:", error);
    // Return success even on error — analytics should never block the user
    return json({ success: true, _error: "Event logging failed" });
  }
};

export const loader = async () => {
  return json({ status: "ok", service: "SwiftCart Event Tracking" });
};
