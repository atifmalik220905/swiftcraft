/**
 * SwiftCart — Cart Evaluation API
 * POST /api/cart/evaluate
 *
 * Accepts cart state from the storefront widget, evaluates all active
 * rules for the merchant, and returns upsell products, milestone status,
 * and fraud signals.
 */

import prisma from "../db.server";
import {
  evaluateUpsellRules,
  evaluateProgressBar,
  evaluateFreeGifts,
  evaluateFraudSignals,
} from "../utils/rules-evaluator";

const json = (data, init = {}) => {
  const responseInit = typeof init === "number" ? { status: init } : init;
  const headers = new Headers(responseInit.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  });
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { shopDomain, sessionId, cart, deviceType, customerCity, pincode } = body;

    if (!shopDomain || !cart) {
      return json({ error: "Missing shopDomain or cart data" }, { status: 400 });
    }

    // Find merchant
    const merchant = await prisma.merchant.findUnique({
      where: { shopDomain },
      include: {
        upsellRules: { where: { isActive: true }, orderBy: { priority: "asc" } },
        progressBarRules: { where: { isActive: true }, orderBy: { milestoneOrder: "asc" } },
        freeGiftRules: { where: { isActive: true } },
        fraudSettings: true,
        cartSettings: true,
      },
    });

    if (!merchant || !merchant.isActive) {
      return json({ error: "Merchant not found or inactive" }, { status: 404 });
    }

    // Check plan limits
    const planLimits = getPlanLimits(merchant.planTier);

    // Cart total in currency (Shopify cart.js returns cents)
    const cartTotal = (cart.total_price || 0) / 100;
    const cartItems = cart.items || [];

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

    // In a real implementation, we'd fetch product details from Shopify API here.
    // For now, return the IDs and let the widget handle display.
    const upsells = allUpsellProductIds.slice(0, 6).map((pid) => ({
      productId: pid,
      // These would be populated from Shopify Admin API in production:
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
      paymentMethod: 'cod', // will be determined at checkout
    });

    // 5. Log analytics event (async, non-blocking)
    logCartEvent(merchant.id, sessionId, cartTotal, deviceType).catch(() => {});

    return json({
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
    });
  } catch (error) {
    console.error("[SwiftCart] Cart evaluation error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
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
