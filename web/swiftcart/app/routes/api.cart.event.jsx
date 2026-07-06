/**
 * SwiftCart — Cart Event Tracking API
 * POST /api/cart/event
 *
 * Receives analytics events from the storefront widget and persists
 * them for the merchant analytics dashboard.
 */

import { getMerchant, createCartEvent } from "../supabase-db.server";

const json = (data, init = {}) => {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  });
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const {
      shopDomain,
      sessionId,
      eventType,
      cartValueBefore,
      cartValueAfter,
      deviceType,
      variantId,
      upsellRuleId,
      code,
    } = body;

    if (!shopDomain || !eventType) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find merchant
    const merchant = await getMerchant(shopDomain);

    if (!merchant || !merchant.isActive) {
      return json({ error: "Merchant not found" }, { status: 404 });
    }

    // Create event record
    await createCartEvent({
      merchantId: merchant.id,
      sessionId: sessionId || "unknown",
      eventType,
      cartValueBefore: cartValueBefore ? cartValueBefore / 100 : 0,
      cartValueAfter: cartValueAfter ? cartValueAfter / 100 : 0,
      upsellRuleId: upsellRuleId || null,
      deviceType: deviceType || "desktop",
    });

    return json({ success: true });
  } catch (error) {
    console.error("[SwiftCart] Event tracking error:", error);
    // Return success even on error — analytics should never block the user
    return json({ success: true });
  }
};

export const loader = async () => {
  return json({ status: "ok", service: "SwiftCart Event Tracking" });
};
