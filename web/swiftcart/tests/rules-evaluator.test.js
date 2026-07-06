/**
 * SwiftCart — Rules Evaluator Tests
 * Run with: npx vitest run tests/rules-evaluator.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateUpsellRules,
  evaluateProgressBar,
  evaluateFreeGifts,
  evaluateFraudSignals,
} from '../app/utils/rules-evaluator.js';

// ─────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────

const mockCart = {
  items: [
    { product_id: 'prod-1', properties: { _tags: 'skincare,face' }, price: 1000 },
    { product_id: 'prod-2', properties: { _tags: 'hair' }, price: 500 },
  ],
  total_price: 150000, // ₹1,500 in cents
  item_count: 2,
};

const mockRules = [
  {
    id: 'rule-1',
    triggerType: 'product',
    triggerValue: JSON.stringify({ productIds: ['prod-1'] }),
    upsellProductIds: JSON.stringify(['upsell-1', 'upsell-2']),
    displayType: 'carousel',
    priority: 0,
    isActive: true,
  },
  {
    id: 'rule-2',
    triggerType: 'cart_value',
    triggerValue: JSON.stringify({ minValue: 1000, maxValue: 5000 }),
    upsellProductIds: JSON.stringify(['upsell-3']),
    displayType: 'grid',
    priority: 1,
    isActive: true,
  },
  {
    id: 'rule-3',
    triggerType: 'tag',
    triggerValue: JSON.stringify({ tags: ['skincare'] }),
    upsellProductIds: JSON.stringify(['upsell-4']),
    displayType: 'single',
    priority: 2,
    isActive: true,
  },
  {
    id: 'rule-inactive',
    triggerType: 'product',
    triggerValue: JSON.stringify({ productIds: ['prod-1'] }),
    upsellProductIds: JSON.stringify(['upsell-hidden']),
    displayType: 'carousel',
    priority: 10,
    isActive: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Upsell Rules Tests
// ─────────────────────────────────────────────────────────────────────────

describe('evaluateUpsellRules', () => {
  it('returns empty array for empty cart', () => {
    const result = evaluateUpsellRules(mockRules, { items: [], total_price: 0 });
    expect(result).toEqual([]);
  });

  it('returns empty array for no rules', () => {
    const result = evaluateUpsellRules([], mockCart);
    expect(result).toEqual([]);
  });

  it('matches product trigger correctly', () => {
    const result = evaluateUpsellRules([mockRules[0]], mockCart);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-1');
    expect(result[0].productIds).toContain('upsell-1');
  });

  it('matches cart_value trigger correctly', () => {
    const result = evaluateUpsellRules([mockRules[1]], mockCart);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-2');
  });

  it('matches tag trigger correctly', () => {
    const result = evaluateUpsellRules([mockRules[2]], mockCart);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('rule-3');
  });

  it('sorts results by priority', () => {
    const reversedRules = [mockRules[2], mockRules[1], mockRules[0]];
    const result = evaluateUpsellRules(reversedRules, mockCart);
    const priorities = result.map((r) =>
      mockRules.find((mr) => mr.id === r.ruleId)?.priority
    );
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  it('ignores inactive rules', () => {
    const result = evaluateUpsellRules([mockRules[3]], mockCart);
    expect(result).toHaveLength(0);
  });

  it('filters out products already in cart', () => {
    const rule = {
      id: 'rule-filter',
      triggerType: 'cart_value',
      triggerValue: JSON.stringify({ minValue: 0 }),
      upsellProductIds: JSON.stringify(['prod-1', 'upsell-new']), // prod-1 is in cart
      displayType: 'carousel',
      priority: 0,
      isActive: true,
    };

    const result = evaluateUpsellRules([rule], mockCart);
    expect(result[0].productIds).not.toContain('prod-1');
    expect(result[0].productIds).toContain('upsell-new');
  });

  it('handles city trigger with context', () => {
    const cityCart = { ...mockCart, _customerCity: 'Mumbai' };
    const cityRule = {
      id: 'city-rule',
      triggerType: 'city',
      triggerValue: JSON.stringify({ cities: ['mumbai', 'delhi'] }),
      upsellProductIds: JSON.stringify(['upsell-city']),
      displayType: 'carousel',
      priority: 0,
      isActive: true,
    };

    const result = evaluateUpsellRules([cityRule], cityCart);
    expect(result).toHaveLength(1);
  });

  it('returns empty for invalid JSON in triggerValue', () => {
    const badRule = {
      id: 'bad-rule',
      triggerType: 'product',
      triggerValue: 'not valid json',
      upsellProductIds: JSON.stringify(['upsell-1']),
      displayType: 'carousel',
      priority: 0,
      isActive: true,
    };

    // Should not throw, should return empty
    const cart = { items: [{ product_id: 'x' }], total_price: 0 };
    expect(() => evaluateUpsellRules([badRule], cart)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Progress Bar Tests
// ─────────────────────────────────────────────────────────────────────────

const mockMilestones = [
  {
    milestoneOrder: 1,
    rewardType: 'free_shipping',
    thresholdAmount: 1000,
    messageBefore: 'Add ₹{remaining} for free shipping',
    messageAfter: 'Free shipping unlocked! 🎉',
    barFillColor: '#10B981',
    barBgColor: '#E2E8F0',
    showShimmer: true,
    isActive: true,
  },
  {
    milestoneOrder: 2,
    rewardType: 'free_gift',
    thresholdAmount: 2000,
    messageBefore: 'Add ₹{remaining} for free gift',
    messageAfter: 'Free gift unlocked!',
    barFillColor: '#3B82F6',
    barBgColor: '#E0E0E0',
    showShimmer: true,
    isActive: true,
  },
];

describe('evaluateProgressBar', () => {
  it('returns empty array for no milestones', () => {
    expect(evaluateProgressBar([], 1000)).toEqual([]);
  });

  it('calculates progress correctly', () => {
    const result = evaluateProgressBar(mockMilestones.slice(0, 1), 500);
    expect(result[0].progress).toBeCloseTo(0.5);
    expect(result[0].remaining).toBe(500);
  });

  it('marks milestone as complete when threshold reached', () => {
    const result = evaluateProgressBar(mockMilestones.slice(0, 1), 1200);
    expect(result[0].isComplete).toBe(true);
    expect(result[0].messageAfter).toBe('Free shipping unlocked! 🎉');
  });

  it('caps progress at 1', () => {
    const result = evaluateProgressBar(mockMilestones.slice(0, 1), 5000);
    expect(result[0].progress).toBeLessThanOrEqual(1);
  });

  it('returns empty for inactive milestones', () => {
    const inactive = [{ ...mockMilestones[0], isActive: false }];
    expect(evaluateProgressBar(inactive, 1000)).toHaveLength(0);
  });

  it('sorts by milestone order', () => {
    const reversed = [mockMilestones[1], mockMilestones[0]];
    const result = evaluateProgressBar(reversed, 1500);
    expect(result[0].milestoneOrder).toBe(1);
    expect(result[1].milestoneOrder).toBe(2);
  });

  it('calculates remaining amount correctly', () => {
    const result = evaluateProgressBar(mockMilestones, 1500);
    expect(result[0].remaining).toBe(0); // Complete
    expect(result[1].remaining).toBe(500); // Not complete
  });

  it('handles multiple milestones', () => {
    const result = evaluateProgressBar(mockMilestones, 2500);
    expect(result).toHaveLength(2);
    expect(result[0].isComplete).toBe(true);
    expect(result[1].isComplete).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Free Gift Tests
// ─────────────────────────────────────────────────────────────────────────

const mockGiftRules = [
  {
    giftProductId: 'gift-1',
    giftProductTitle: 'Free Sample',
    thresholdAmount: 1500,
    allowChoice: false,
    isActive: true,
  },
  {
    giftProductId: 'gift-2',
    giftProductTitle: 'Premium Gift',
    thresholdAmount: 3000,
    allowChoice: true,
    choiceCollectionId: 'collection-1',
    isActive: true,
  },
];

describe('evaluateFreeGifts', () => {
  it('returns empty object for no rules', () => {
    expect(evaluateFreeGifts([], 1000, [])).toEqual({
      giftsToAdd: [],
      giftsToRemove: [],
    });
  });

  it('adds gift when threshold reached', () => {
    const cartItems = [{ product_id: 'prod-1' }];
    const result = evaluateFreeGifts([mockGiftRules[0]], 1600, cartItems);
    expect(result.giftsToAdd).toHaveLength(1);
    expect(result.giftsToAdd[0].productId).toBe('gift-1');
  });

  it('does not add gift below threshold', () => {
    const cartItems = [{ product_id: 'prod-1' }];
    const result = evaluateFreeGifts([mockGiftRules[0]], 1000, cartItems);
    expect(result.giftsToAdd).toHaveLength(0);
  });

  it('does not add gift if already in cart', () => {
    const cartItems = [{ product_id: 'gift-1' }];
    const result = evaluateFreeGifts([mockGiftRules[0]], 2000, cartItems);
    expect(result.giftsToAdd).toHaveLength(0);
  });

  it('removes gift when cart drops below threshold', () => {
    const cartItems = [{ product_id: 'gift-1' }];
    const result = evaluateFreeGifts([mockGiftRules[0]], 1000, cartItems);
    expect(result.giftsToRemove).toHaveLength(1);
    expect(result.giftsToRemove[0].productId).toBe('gift-1');
  });

  it('handles multiple gift rules', () => {
    const cartItems = [{ product_id: 'prod-1' }];
    const result = evaluateFreeGifts(mockGiftRules, 3500, cartItems);
    expect(result.giftsToAdd).toHaveLength(2);
  });

  it('respects active status', () => {
    const inactiveRule = { ...mockGiftRules[0], isActive: false };
    const result = evaluateFreeGifts([inactiveRule], 2000, []);
    expect(result.giftsToAdd).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Fraud Signals Tests
// ─────────────────────────────────────────────────────────────────────────

const mockFraudSettings = {
  enablePincodeBlock: true,
  blockedPincodes: JSON.stringify(['110001', '400001', '560001']),
  enableCodOtp: true,
  codOtpThreshold: 5000,
  hideCodAbove: 10000,
  enableAddressCheck: true,
};

describe('evaluateFraudSignals', () => {
  it('returns safe defaults for no settings', () => {
    const result = evaluateFraudSignals(null, { cartTotal: 1000 });
    expect(result.warnings).toHaveLength(0);
    expect(result.blockCod).toBe(false);
    expect(result.requireOtp).toBe(false);
  });

  it('flags blocked pincode', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      pincode: '110001',
      cartTotal: 1000,
    });
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('high_rto_pincode');
  });

  it('does not flag allowed pincode', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      pincode: '123456',
      cartTotal: 1000,
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('requires OTP for COD above threshold', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      cartTotal: 6000,
      paymentMethod: 'cod',
    });
    expect(result.requireOtp).toBe(true);
  });

  it('does not require OTP below threshold', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      cartTotal: 4000,
      paymentMethod: 'cod',
    });
    expect(result.requireOtp).toBe(false);
  });

  it('blocks COD above hide threshold', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      cartTotal: 12000,
    });
    expect(result.blockCod).toBe(true);
  });

  it('does not block COD below threshold', () => {
    const result = evaluateFraudSignals(mockFraudSettings, {
      cartTotal: 8000,
    });
    expect(result.blockCod).toBe(false);
  });

  it('handles invalid JSON in blockedPincodes', () => {
    const badSettings = { ...mockFraudSettings, blockedPincodes: 'not json' };
    const result = evaluateFraudSignals(badSettings, {
      pincode: '110001',
      cartTotal: 1000,
    });
    // Should not throw, should return empty
    expect(result.warnings).toHaveLength(0);
  });
});
