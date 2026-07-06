/**
 * SwiftCart — Cart Evaluation API
 * POST /api/cart/evaluate
 *
 * Accepts cart state from the storefront widget, evaluates all active
 * rules for the merchant, and returns upsell products, milestone status,
 * and fraud signals.
 */

import {
  getMerchantWithRelations,
  createCartEvent,
} from "../supabase-db.server";
import {
  evaluateUpsellRules,
  evaluateProgressBar,
  evaluateFreeGifts,
  evaluateFraudSignals,
} from "../utils/rules-evaluator";
import { unauthenticated } from "../shopify.server";
import cache from "../utils/cache";

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
    const { shopDomain, sessionId, cart, deviceType, customerCity, pincode, couponCode } = body;

    if (!shopDomain || !cart) {
      return json({ error: "Missing shopDomain or cart data" }, { status: 400 });
    }

    // Find merchant config (cached for 5 minutes)
    const cacheKey = cache.merchantConfigKey(shopDomain);
    const merchant = await cache.cacheGetOrCompute(
      cacheKey,
      () => getMerchantWithRelations(shopDomain, {
        upsellRules: true,
        upsellRulesFilter: { isActive: true },
        upsellRulesOrderBy: { priority: "asc" },
        progressBarRules: true,
        progressBarRulesFilter: { isActive: true },
        progressBarRulesOrderBy: { milestoneOrder: "asc" },
        freeGiftRules: true,
        freeGiftRulesFilter: { isActive: true },
        fraudSettings: true,
        cartSettings: true,
        discounts: true,
        volumeDiscountRules: true,
      }),
      5 * 60 * 1000
    );

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

    // Fetch real product details from Shopify Admin GraphQL API
    let upsells = [];
    const slicedProductIds = allUpsellProductIds.slice(0, 6);
    if (slicedProductIds.length > 0) {
      try {
        const { admin } = await unauthenticated.admin(shopDomain);
        const query = `#graphql
          query getProducts($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                featuredImage {
                  url
                }
                variants(first: 1) {
                  nodes {
                    id
                    price
                  }
                }
              }
            }
          }
        `;
        const response = await admin.graphql(query, {
          variables: { ids: slicedProductIds }
        });
        const responseJson = await response.json();
        const nodes = responseJson.data?.nodes || [];
        
        upsells = nodes
          .filter((node) => node && node.id)
          .map((node) => {
            const firstVariant = node.variants?.nodes?.[0];
            return {
              productId: node.id,
              title: node.title,
              price: firstVariant ? Math.round(parseFloat(firstVariant.price) * 100) : 0, // convert to cents
              image: node.featuredImage?.url || "",
              variantId: firstVariant?.id || node.id,
            };
          });
      } catch (err) {
        console.warn("[SwiftCart] Failed to fetch upsell details from Shopify:", err);
        // Fallback
        upsells = slicedProductIds.map((pid) => ({
          productId: pid,
          title: "Recommended Product",
          price: 0,
          image: "",
          variantId: pid,
        }));
      }
    }

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

    // 5. Evaluate custom discounts coupon
    let appliedDiscount = null;
    if (couponCode && merchant.discounts) {
      const codeUpper = couponCode.trim().toUpperCase();
      const matched = merchant.discounts.find(
        (d) => d.code === codeUpper && d.isActive
      );

      if (matched) {
        if (cartTotal >= matched.minCartAmount) {
          let savings = 0;
          if (matched.discountType === "percentage") {
            savings = cartTotal * (matched.discountValue / 100);
          } else if (matched.discountType === "fixed_amount") {
            savings = Math.min(matched.discountValue, cartTotal);
          }

          appliedDiscount = {
            valid: true,
            code: matched.code,
            discountType: matched.discountType,
            discountValue: matched.discountValue,
            savings: parseFloat(savings.toFixed(2)),
          };
        } else {
          appliedDiscount = {
            valid: false,
            message: `Minimum subtotal of ₹${matched.minCartAmount} required`,
          };
        }
      } else {
        appliedDiscount = {
          valid: false,
          message: "Invalid coupon code",
        };
      }
    }

    // 6. Evaluate volume discounts (respect plan limits if any)
    let volumeDiscountSavings = 0;
    const appliedVolumeTiers = [];

    if (planLimits.hasVolumeDiscount && merchant.volumeDiscountRules && merchant.volumeDiscountRules.length > 0) {
      for (const item of cartItems) {
        const quantity = item.quantity || 0;
        const price = (item.price || 0) / 100; // Shopify returns price in cents

        const matchedRules = merchant.volumeDiscountRules.filter(
          (r) => r.isActive && (r.productId === "all" || r.productId === String(item.product_id) || r.productId === `gid://shopify/Product/${item.product_id}`)
        );

        if (matchedRules.length > 0) {
          // Sort to find the highest quantity tier matched
          const applicableRules = matchedRules
            .filter((r) => quantity >= r.quantity)
            .sort((a, b) => b.quantity - a.quantity);

          if (applicableRules.length > 0) {
            const rule = applicableRules[0];
            let itemSavings = 0;
            if (rule.discountType === "percentage") {
              itemSavings = (price * quantity) * (rule.discountValue / 100);
            } else if (rule.discountType === "fixed_amount") {
              itemSavings = Math.min(rule.discountValue, price * quantity);
            }

            volumeDiscountSavings += itemSavings;
            appliedVolumeTiers.push({
              ruleName: rule.ruleName,
              productId: String(item.product_id),
              savings: parseFloat(itemSavings.toFixed(2)),
            });
          }
        }
      }
    }

    // Calculate expected delivery date (EDD) & pincode check
    let pincodeResult = null;
    if (pincode && pincode.trim().length === 6) {
      const pin = pincode.trim();
      const isCodBlocked = fraudResult.blockCod || (merchant.fraudSettings?.enablePincodeBlock && 
        JSON.parse(merchant.fraudSettings.blockedPincodes || "[]").includes(String(pin)));

      // Mock delivery EDD: current date + 3 to 5 days
      const minDays = 3;
      const maxDays = 5;
      const daysToAdd = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
      
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      const eddString = deliveryDate.toLocaleDateString('en-IN', options);

      pincodeResult = {
        pincode: pin,
        serviceable: true,
        edd: eddString,
        codAvailable: !isCodBlocked,
        message: isCodBlocked 
          ? `Prepaid orders only (COD unavailable at ${pin})` 
          : `Delivered by ${eddString} | COD Available`,
      };
    }

    // 7. Log analytics event (async, non-blocking)
    logCartEvent(merchant.id, sessionId, cartTotal, deviceType).catch(() => {});

    return json({
      upsells,
      milestones,
      gifts: giftStatus,
      fraud: fraudResult,
      discount: appliedDiscount,
      volumeDiscounts: {
        savings: parseFloat(volumeDiscountSavings.toFixed(2)),
        tiers: appliedVolumeTiers,
      },
      settings: merchant.cartSettings || {},
      pincodeResult,
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
    await createCartEvent({
      merchantId,
      sessionId: sessionId || 'unknown',
      eventType: 'cart_open',
      cartValueBefore: cartTotal,
      cartValueAfter: cartTotal,
      deviceType: deviceType || 'desktop',
    });
  } catch (e) {
    console.warn("[SwiftCart] Failed to log cart event:", e.message);
  }
}

// Handle GET with a simple health check
export const loader = async () => {
  return json({ status: "ok", service: "SwiftCart Cart Evaluation API" });
};
