/**
 * SwiftCart — Validation Utilities Tests
 * Run with: npx vitest run tests/validation.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  validateShopDomain,
  validateNumericId,
  validateCurrencyAmount,
  validateShopifyGid,
  validateHexColor,
  validateUrl,
  validateEventType,
  validateDeviceType,
  validateSessionId,
  validatePlanTier,
  validateTriggerType,
  validateDisplayType,
  validateRewardType,
  validatePagination,
  sanitizeString,
} from '../app/utils/validation.js';

describe('validateShopDomain', () => {
  it('accepts valid shop domains', () => {
    expect(validateShopDomain('mystore.myshopify.com')).toEqual({
      valid: true,
      normalized: 'mystore.myshopify.com',
    });

    expect(validateShopDomain('MY-STORE.MyShopify.com')).toEqual({
      valid: true,
      normalized: 'my-store.myshopify.com',
    });
  });

  it('rejects invalid shop domains', () => {
    expect(validateShopDomain('invalid.com').valid).toBe(false);
    expect(validateShopDomain('').valid).toBe(false);
    expect(validateShopDomain(null).valid).toBe(false);
    expect(validateShopDomain('a'.repeat(300) + '.myshopify.com').valid).toBe(false);
  });

  it('trims whitespace', () => {
    const result = validateShopDomain('  mystore.myshopify.com  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('mystore.myshopify.com');
  });
});

describe('validateNumericId', () => {
  it('accepts valid numeric IDs', () => {
    expect(validateNumericId(123, 'test').valid).toBe(true);
    expect(validateNumericId('456', 'test').valid).toBe(true);
    expect(validateNumericId(1, 'test').valid).toBe(true);
  });

  it('rejects invalid numeric IDs', () => {
    expect(validateNumericId('abc', 'test').valid).toBe(false);
    expect(validateNumericId(-1, 'test').valid).toBe(false);
    expect(validateNumericId(0, 'test').valid).toBe(false);
  });

  it('respects min/max bounds', () => {
    expect(validateNumericId(5, 'test', { min: 10 }).valid).toBe(false);
    expect(validateNumericId(100, 'test', { max: 50 }).valid).toBe(false);
  });

  it('handles required=false', () => {
    expect(validateNumericId(null, 'test', { required: false }).valid).toBe(true);
    expect(validateNumericId(null, 'test', { required: false }).value).toBe(null);
  });
});

describe('validateCurrencyAmount', () => {
  it('accepts valid amounts', () => {
    expect(validateCurrencyAmount(100, 'price').valid).toBe(true);
    expect(validateCurrencyAmount(0, 'price').valid).toBe(true);
    expect(validateCurrencyAmount(999.99, 'price').valid).toBe(true);
  });

  it('rejects negative amounts', () => {
    expect(validateCurrencyAmount(-10, 'price').valid).toBe(false);
  });

  it('rounds to 2 decimal places', () => {
    const result = validateCurrencyAmount(99.999, 'price');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(100);
  });
});

describe('validateShopifyGid', () => {
  it('accepts valid Shopify GIDs', () => {
    expect(validateShopifyGid('gid://shopify/Product/123456').valid).toBe(true);
    expect(validateShopifyGid('gid://shopify/ProductVariant/789').valid).toBe(true);
  });

  it('rejects invalid GIDs', () => {
    expect(validateShopifyGid('invalid').valid).toBe(false);
    expect(validateShopifyGid('gid://shopify/Product/').valid).toBe(false);
  });

  it('validates type if specified', () => {
    expect(validateShopifyGid('gid://shopify/Product/123', 'Product').valid).toBe(true);
    expect(validateShopifyGid('gid://shopify/Collection/123', 'Product').valid).toBe(false);
  });
});

describe('validateHexColor', () => {
  it('accepts valid hex colors', () => {
    expect(validateHexColor('#FF5733').valid).toBe(true);
    expect(validateHexColor('#fff').valid).toBe(true);
    expect(validateHexColor('#ABCDEF').valid).toBe(true);
  });

  it('rejects invalid colors', () => {
    expect(validateHexColor('FF5733').valid).toBe(false);
    expect(validateHexColor('#GGGGGG').valid).toBe(false);
    expect(validateHexColor('#12').valid).toBe(false);
  });
});

describe('validateUrl', () => {
  it('accepts valid URLs', () => {
    expect(validateUrl('https://example.com').valid).toBe(true);
    expect(validateUrl('http://localhost:3000').valid).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(validateUrl('not a url').valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
  });

  it('enforces HTTPS if required', () => {
    expect(validateUrl('http://example.com', { requireHttps: true }).valid).toBe(false);
    expect(validateUrl('https://example.com', { requireHttps: true }).valid).toBe(true);
  });
});

describe('validateEventType', () => {
  it('accepts valid event types', () => {
    expect(validateEventType('cart_open').valid).toBe(true);
    expect(validateEventType('upsell_click').valid).toBe(true);
    expect(validateEventType('checkout').valid).toBe(true);
  });

  it('rejects invalid event types', () => {
    expect(validateEventType('invalid_event').valid).toBe(false);
    expect(validateEventType('').valid).toBe(false);
  });
});

describe('validateDeviceType', () => {
  it('accepts valid device types', () => {
    expect(validateDeviceType('mobile').valid).toBe(true);
    expect(validateDeviceType('desktop').valid).toBe(true);
    expect(validateDeviceType('tablet').valid).toBe(true);
  });

  it('defaults to desktop for missing input', () => {
    const result = validateDeviceType(null);
    expect(result.valid).toBe(true);
    expect(result.value).toBe('desktop');
  });

  it('rejects invalid device types', () => {
    expect(validateDeviceType('watch').valid).toBe(false);
  });
});

describe('validateSessionId', () => {
  it('accepts SwiftCart session IDs', () => {
    expect(validateSessionId('sc_abc123_20240101').valid).toBe(true);
  });

  it('accepts Shopify-style session IDs', () => {
    expect(validateSessionId('abc123def456123abc123def456123ab').valid).toBe(true);
  });

  it('rejects invalid session IDs', () => {
    expect(validateSessionId('short').valid).toBe(false);
    expect(validateSessionId('x'.repeat(5)).valid).toBe(false);
  });
});

describe('validatePlanTier', () => {
  it('accepts valid plan tiers', () => {
    expect(validatePlanTier('starter').valid).toBe(true);
    expect(validatePlanTier('growth').valid).toBe(true);
    expect(validatePlanTier('SCALE').valid).toBe(true);
  });

  it('normalizes to lowercase', () => {
    const result = validatePlanTier('STARTER');
    expect(result.valid).toBe(true);
    expect(result.value).toBe('starter');
  });

  it('rejects invalid tiers', () => {
    expect(validatePlanTier('premium').valid).toBe(false);
  });
});

describe('validateTriggerType', () => {
  it('accepts valid trigger types', () => {
    expect(validateTriggerType('product').valid).toBe(true);
    expect(validateTriggerType('cart_value').valid).toBe(true);
    expect(validateTriggerType('tag').valid).toBe(true);
  });

  it('rejects invalid trigger types', () => {
    expect(validateTriggerType('invalid').valid).toBe(false);
  });
});

describe('validateDisplayType', () => {
  it('accepts valid display types', () => {
    expect(validateDisplayType('carousel').valid).toBe(true);
    expect(validateDisplayType('grid').valid).toBe(true);
    expect(validateDisplayType('single').valid).toBe(true);
  });

  it('defaults to carousel', () => {
    const result = validateDisplayType(null);
    expect(result.valid).toBe(true);
    expect(result.value).toBe('carousel');
  });
});

describe('validateRewardType', () => {
  it('accepts valid reward types', () => {
    expect(validateRewardType('free_shipping').valid).toBe(true);
    expect(validateRewardType('free_gift').valid).toBe(true);
    expect(validateRewardType('discount').valid).toBe(true);
  });

  it('rejects invalid reward types', () => {
    expect(validateRewardType('points').valid).toBe(false);
  });
});

describe('validatePagination', () => {
  it('applies defaults', () => {
    const result = validatePagination(null, null);
    expect(result.valid).toBe(true);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('validates custom values', () => {
    const result = validatePagination('2', '50');
    expect(result.valid).toBe(true);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('enforces max limit', () => {
    const result = validatePagination('1', '500', { maxLimit: 100 });
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('truncates to max length', () => {
    const result = sanitizeString('a'.repeat(100), { maxLength: 10 });
    expect(result.length).toBe(10);
  });

  it('escapes HTML characters by default', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('preserves HTML when allowed', () => {
    const result = sanitizeString('<b>bold</b>', { allowHtml: true });
    expect(result).toBe('<b>bold</b>');
  });

  it('removes newlines when disabled', () => {
    const result = sanitizeString('hello\nworld', { allowNewlines: false });
    expect(result).toBe('hello world');
  });
});
