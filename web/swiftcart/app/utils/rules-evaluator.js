/**
 * SwiftCart — Rules Evaluation Engine
 * Evaluates upsell rules, progress bar milestones, free gifts,
 * and fraud signals against current cart state.
 */

/**
 * Evaluate upsell rules against cart state.
 * Returns matched upsell product IDs sorted by rule priority.
 *
 * @param {Array} rules - Active UpsellRule records from DB
 * @param {Object} cart - Shopify cart.js response
 * @returns {Array} - Array of { ruleId, productIds, displayType }
 */
export function evaluateUpsellRules(rules, cart) {
  if (!rules?.length || !cart?.items?.length) return [];

  const cartProductIds = cart.items.map((i) => String(i.product_id));
  const cartTags = cart.items.flatMap((i) => (i.properties?._tags || '').split(',').map((t) => t.trim().toLowerCase()));
  const cartTotal = cart.total_price / 100; // convert cents to currency

  const matched = [];

  // Sort rules by priority (lower = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (!rule.isActive) continue;

    let trigger;
    try {
      trigger = JSON.parse(rule.triggerValue);
    } catch {
      continue;
    }

    let isMatch = false;

    switch (rule.triggerType) {
      case 'product':
        // Match if cart contains any of the specified product IDs
        isMatch = (trigger.productIds || []).some((pid) =>
          cartProductIds.includes(String(pid))
        );
        break;

      case 'collection':
        // Match by collection tags (simplified — real implementation would use Shopify API)
        isMatch = (trigger.collectionTags || []).some((tag) =>
          cartTags.includes(tag.toLowerCase())
        );
        break;

      case 'cart_value':
        // Match if cart total is within range
        isMatch =
          cartTotal >= (trigger.minValue || 0) &&
          cartTotal <= (trigger.maxValue || Infinity);
        break;

      case 'tag':
        // Match if any cart item has a matching tag
        isMatch = (trigger.tags || []).some((tag) =>
          cartTags.includes(tag.toLowerCase())
        );
        break;

      case 'city': {
        // City-based matching (passed via cart metadata or customer data)
        const customerCity = (cart._customerCity || '').toLowerCase();
        isMatch = (trigger.cities || []).some(
          (c) => c.toLowerCase() === customerCity
        );
        break;
      }

      default:
        break;
    }

    if (isMatch) {
      let upsellProductIds;
      try {
        upsellProductIds = JSON.parse(rule.upsellProductIds);
      } catch {
        upsellProductIds = [];
      }

      // Filter out products already in cart
      const filteredIds = upsellProductIds.filter(
        (pid) => !cartProductIds.includes(String(pid))
      );

      if (filteredIds.length > 0) {
        matched.push({
          ruleId: rule.id,
          productIds: filteredIds,
          displayType: rule.displayType,
        });
      }
    }
  }

  return matched;
}

/**
 * Evaluate progress bar milestones against cart total.
 *
 * @param {Array} milestones - ProgressBarRule records (sorted by milestoneOrder)
 * @param {number} cartTotal - Cart total in currency (not cents)
 * @returns {Array} - Milestone status objects
 */
export function evaluateProgressBar(milestones, cartTotal) {
  if (!milestones?.length) return [];

  return milestones
    .filter((m) => m.isActive)
    .sort((a, b) => a.milestoneOrder - b.milestoneOrder)
    .map((m) => {
      const threshold = m.thresholdAmount;
      const progress = threshold > 0 ? Math.min(1, cartTotal / threshold) : 1;
      const remaining = Math.max(0, threshold - cartTotal);
      const isComplete = progress >= 1;

      // Replace template variables in messages
      const messageBefore = (m.messageBefore || '')
        .replace('{remaining}', remaining.toLocaleString('en-IN'))
        .replace('{reward}', getRewardLabel(m.rewardType, m.rewardValue));

      const messageAfter = (m.messageAfter || '')
        .replace('{reward}', getRewardLabel(m.rewardType, m.rewardValue));

      return {
        milestoneOrder: m.milestoneOrder,
        rewardType: m.rewardType,
        threshold,
        progress,
        remaining,
        isComplete,
        messageBefore,
        messageAfter: isComplete ? messageAfter : '',
        barFillColor: m.barFillColor,
        barBgColor: m.barBgColor,
        showShimmer: m.showShimmer,
        rewardValue: m.rewardValue,
      };
    });
}

/**
 * Evaluate free gift eligibility.
 *
 * @param {Array} giftRules - FreeGiftRule records
 * @param {number} cartTotal - Cart total in currency
 * @param {Array} cartItems - Cart items array
 * @returns {Object} - { giftsToAdd: [], giftsToRemove: [] }
 */
export function evaluateFreeGifts(giftRules, cartTotal, cartItems) {
  if (!giftRules?.length) return { giftsToAdd: [], giftsToRemove: [] };

  const cartProductIds = cartItems.map((i) => String(i.product_id));
  const giftsToAdd = [];
  const giftsToRemove = [];

  for (const rule of giftRules) {
    if (!rule.isActive) continue;

    const isEligible = cartTotal >= rule.thresholdAmount;
    const isInCart = cartProductIds.includes(String(rule.giftProductId));

    if (isEligible && !isInCart) {
      giftsToAdd.push({
        productId: rule.giftProductId,
        title: rule.giftProductTitle,
        allowChoice: rule.allowChoice,
        choiceCollectionId: rule.choiceCollectionId,
      });
    } else if (!isEligible && isInCart) {
      giftsToRemove.push({
        productId: rule.giftProductId,
      });
    }
  }

  return { giftsToAdd, giftsToRemove };
}

/**
 * Check fraud signals for the given cart/order context.
 *
 * @param {Object} fraudSettings - FraudSettings record
 * @param {Object} context - { pincode, cartTotal, paymentMethod }
 * @returns {Object} - { warnings: [], blockCod: boolean, requireOtp: boolean }
 */
export function evaluateFraudSignals(fraudSettings, context) {
  const result = { warnings: [], blockCod: false, requireOtp: false };
  if (!fraudSettings) return result;

  const { pincode, cartTotal, paymentMethod } = context;

  // Pincode blocklist check
  if (fraudSettings.enablePincodeBlock && pincode) {
    let blockedPincodes;
    try {
      blockedPincodes = JSON.parse(fraudSettings.blockedPincodes);
    } catch {
      blockedPincodes = [];
    }

    if (blockedPincodes.includes(String(pincode))) {
      result.warnings.push({
        type: 'high_rto_pincode',
        message: `Pincode ${pincode} has high return rates. Consider prepaid payment.`,
      });
    }
  }

  // COD OTP requirement
  if (
    fraudSettings.enableCodOtp &&
    paymentMethod === 'cod' &&
    cartTotal >= fraudSettings.codOtpThreshold
  ) {
    result.requireOtp = true;
  }

  // Hide COD above threshold
  if (fraudSettings.hideCodAbove && cartTotal >= fraudSettings.hideCodAbove) {
    result.blockCod = true;
  }

  return result;
}

// ─── Helpers ───

function getRewardLabel(rewardType, rewardValue) {
  switch (rewardType) {
    case 'free_shipping':
      return 'Free Shipping';
    case 'free_gift':
      return `a free gift`;
    case 'discount':
      return `${rewardValue || ''}% discount`;
    default:
      return 'a reward';
  }
}
