/**
 * SwiftCart — Input Validation Utilities
 * Comprehensive validation for all API inputs
 *
 * Security principles:
 * - Never trust client input
 * - Validate type, range, and format
 * - Sanitize for XSS prevention
 * - Use parameterized queries for SQL
 */

/**
 * Validate Shopify shop domain format
 * @param {string} shopDomain
 * @returns {{ valid: boolean, error?: string, normalized?: string }}
 */
export function validateShopDomain(shopDomain) {
  if (!shopDomain || typeof shopDomain !== 'string') {
    return { valid: false, error: 'Shop domain is required' };
  }

  const trimmed = shopDomain.trim().toLowerCase();

  // Must end with .myshopify.com
  if (!trimmed.endsWith('.myshopify.com')) {
    return { valid: false, error: 'Invalid shop domain format. Must end with .myshopify.com' };
  }

  // Length check
  if (trimmed.length < 10 || trimmed.length > 255) {
    return { valid: false, error: 'Shop domain must be 10-255 characters' };
  }

  // Only alphanumeric and hyphens before .myshopify.com
  const prefix = trimmed.replace('.myshopify.com', '');
  if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(prefix) && prefix.length > 1) {
    return { valid: false, error: 'Shop domain contains invalid characters' };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Validate numeric ID (e.g., product ID, variant ID)
 * @param {any} value
 * @param {string} fieldName
 * @param {object} options
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateNumericId(value, fieldName, options = {}) {
  const { min = 1, max = Number.MAX_SAFE_INTEGER, required = true } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (parsed < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (parsed > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` };
  }

  return { valid: true, value: parsed };
}

/**
 * Validate currency amount (in cents or rupees)
 * @param {any} value
 * @param {string} fieldName
 * @param {object} options
 * @returns {{ valid: boolean, error?: string, value?: number }}
 */
export function validateCurrencyAmount(value, fieldName, options = {}) {
  const { min = 0, max = 100000000, required = true, inCents = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (parsed < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (parsed > max) {
    return { valid: false, error: `${fieldName} exceeds maximum allowed value` };
  }

  // Round to 2 decimal places for currency
  const rounded = Math.round(parsed * 100) / 100;

  return { valid: true, value: rounded };
}

/**
 * Validate Shopify GID (Global ID)
 * @param {string} gid
 * @param {string} expectedType - e.g., 'Product', 'ProductVariant', 'Collection'
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateShopifyGid(gid, expectedType = null) {
  if (!gid || typeof gid !== 'string') {
    return { valid: false, error: 'GID is required' };
  }

  // Basic format: gid://shopify/{Type}/{id}
  const gidPattern = /^gid:\/\/shopify\/([A-Za-z]+)\/([0-9]+)$/;

  if (!gidPattern.test(gid)) {
    return { valid: false, error: 'Invalid Shopify GID format' };
  }

  const match = gid.match(gidPattern);
  const type = match[1];

  if (expectedType && type !== expectedType) {
    return { valid: false, error: `Expected ${expectedType} GID, got ${type}` };
  }

  return { valid: true };
}

/**
 * Validate JSON string
 * @param {string} jsonString
 * @returns {{ valid: boolean, error?: string, parsed?: any }}
 */
export function validateJsonString(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return { valid: false, error: 'JSON string is required' };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return { valid: true, parsed };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

/**
 * Sanitize string input for safe display (XSS prevention)
 * @param {string} input
 * @param {object} options
 * @returns {string}
 */
export function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const { maxLength = 10000, allowHtml = false, allowNewlines = true } = options;

  let sanitized = input.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // If HTML not allowed, escape dangerous characters
  if (!allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Handle newlines
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  return sanitized;
}

/**
 * Validate hex color code
 * @param {string} color
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHexColor(color) {
  if (!color || typeof color !== 'string') {
    return { valid: false, error: 'Color is required' };
  }

  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  if (!hexPattern.test(color)) {
    return { valid: false, error: 'Invalid hex color format' };
  }

  return { valid: true };
}

/**
 * Validate URL format
 * @param {string} url
 * @param {object} options
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUrl(url, options = {}) {
  const { requireHttps = false, allowedDomains = null } = options;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);

    if (requireHttps && parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' };
    }

    if (allowedDomains && !allowedDomains.includes(parsed.hostname)) {
      return { valid: false, error: 'URL domain not allowed' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate event type (for analytics)
 * @param {string} eventType
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEventType(eventType) {
  const validTypes = [
    'cart_open',
    'upsell_click',
    'upsell_add',
    'checkout',
    'gift_unlocked',
    'coupon_applied',
    'discount_applied',
    'milestone_reached',
  ];

  if (!eventType || typeof eventType !== 'string') {
    return { valid: false, error: 'Event type is required' };
  }

  if (!validTypes.includes(eventType)) {
    return { valid: false, error: `Invalid event type. Must be one of: ${validTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate device type
 * @param {string} deviceType
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDeviceType(deviceType) {
  const validTypes = ['mobile', 'desktop', 'tablet'];

  if (!deviceType) {
    return { valid: true, value: 'desktop' }; // Default
  }

  if (!validTypes.includes(deviceType)) {
    return { valid: false, error: `Invalid device type. Must be one of: ${validTypes.join(', ')}` };
  }

  return { valid: true, value: deviceType };
}

/**
 * Validate session ID format
 * @param {string} sessionId
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Session ID is required' };
  }

  // SwiftCart session IDs: sc_{random}_{timestamp}
  const scPattern = /^sc_[a-z0-9]+_[a-z0-9]+$/;

  // Also allow Shopify session IDs
  const shopifyPattern = /^[a-f0-9]{32}$/;

  if (!scPattern.test(sessionId) && !shopifyPattern.test(sessionId)) {
    // Allow any alphanumeric string 10-100 chars as fallback
    if (!/^[a-zA-Z0-9_-]{10,100}$/.test(sessionId)) {
      return { valid: false, error: 'Invalid session ID format' };
    }
  }

  return { valid: true };
}

/**
 * Validate plan tier
 * @param {string} planTier
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlanTier(planTier) {
  const validTiers = ['starter', 'growth', 'scale', 'enterprise'];

  if (!planTier || typeof planTier !== 'string') {
    return { valid: false, error: 'Plan tier is required' };
  }

  if (!validTiers.includes(planTier.toLowerCase())) {
    return { valid: false, error: `Invalid plan tier. Must be one of: ${validTiers.join(', ')}` };
  }

  return { valid: true, value: planTier.toLowerCase() };
}

/**
 * Validate trigger type (for upsell rules)
 * @param {string} triggerType
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTriggerType(triggerType) {
  const validTypes = ['product', 'collection', 'cart_value', 'tag', 'city'];

  if (!triggerType || typeof triggerType !== 'string') {
    return { valid: false, error: 'Trigger type is required' };
  }

  if (!validTypes.includes(triggerType)) {
    return { valid: false, error: `Invalid trigger type. Must be one of: ${validTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate display type (for upsell rules)
 * @param {string} displayType
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateDisplayType(displayType) {
  const validTypes = ['carousel', 'grid', 'single'];

  if (!displayType) {
    return { valid: true, value: 'carousel' }; // Default
  }

  if (!validTypes.includes(displayType)) {
    return { valid: false, error: `Invalid display type. Must be one of: ${validTypes.join(', ')}` };
  }

  return { valid: true, value: displayType };
}

/**
 * Validate trigger value JSON
 * @param {string} triggerValue
 * @param {string} triggerType
 * @returns {{ valid: boolean, error?: string, parsed?: object }}
 */
export function validateTriggerValue(triggerValue, triggerType) {
  const parsed = validateJsonString(triggerValue);

  if (!parsed.valid) {
    return parsed;
  }

  const data = parsed.parsed;

  // Validate based on trigger type
  switch (triggerType) {
    case 'product':
      if (!Array.isArray(data.productIds) && data.productIds !== undefined) {
        return { valid: false, error: 'productIds must be an array' };
      }
      break;

    case 'collection':
      if (!Array.isArray(data.collectionIds) && !Array.isArray(data.collectionTags)) {
        return { valid: false, error: 'collectionIds or collectionTags required' };
      }
      break;

    case 'cart_value':
      if (data.minValue !== undefined && typeof data.minValue !== 'number') {
        return { valid: false, error: 'minValue must be a number' };
      }
      if (data.maxValue !== undefined && typeof data.maxValue !== 'number') {
        return { valid: false, error: 'maxValue must be a number' };
      }
      if (data.minValue !== undefined && data.maxValue !== undefined && data.minValue > data.maxValue) {
        return { valid: false, error: 'minValue cannot exceed maxValue' };
      }
      break;

    case 'tag':
      if (!Array.isArray(data.tags)) {
        return { valid: false, error: 'tags must be an array' };
      }
      break;

    case 'city':
      if (!Array.isArray(data.cities)) {
        return { valid: false, error: 'cities must be an array' };
      }
      break;
  }

  return { valid: true, parsed: data };
}

/**
 * Validate reward type (for progress bar / free gifts)
 * @param {string} rewardType
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRewardType(rewardType) {
  const validTypes = ['free_shipping', 'free_gift', 'discount'];

  if (!rewardType || typeof rewardType !== 'string') {
    return { valid: false, error: 'Reward type is required' };
  }

  if (!validTypes.includes(rewardType)) {
    return { valid: false, error: `Invalid reward type. Must be one of: ${validTypes.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate pagination parameters
 * @param {any} page
 * @param {any} limit
 * @param {object} options
 * @returns {{ valid: boolean, error?: string, page?: number, limit?: number }}
 */
export function validatePagination(page, limit, options = {}) {
  const { maxLimit = 100, defaultLimit = 20, defaultPage = 1 } = options;

  let parsedPage = page ? parseInt(page, 10) : defaultPage;
  let parsedLimit = limit ? parseInt(limit, 10) : defaultLimit;

  if (isNaN(parsedPage) || parsedPage < 1) {
    return { valid: false, error: 'Page must be a positive integer' };
  }

  if (isNaN(parsedLimit) || parsedLimit < 1) {
    return { valid: false, error: 'Limit must be a positive integer' };
  }

  if (parsedLimit > maxLimit) {
    return { valid: false, error: `Limit cannot exceed ${maxLimit}` };
  }

  return { valid: true, page: parsedPage, limit: parsedLimit };
}

/**
 * Validate and parse sort parameters
 * @param {string} sortBy
 * @param {string} sortOrder
 * @param {string[]} allowedFields
 * @returns {{ valid: boolean, error?: string, sortBy?: string, sortOrder?: string }}
 */
export function validateSort(sortBy, sortOrder, allowedFields) {
  if (!sortBy) {
    return { valid: true, sortBy: 'createdAt', sortOrder: 'desc' };
  }

  if (!allowedFields.includes(sortBy)) {
    return { valid: false, error: `Invalid sort field. Allowed: ${allowedFields.join(', ')}` };
  }

  const validOrder = ['asc', 'desc'];
  const parsedOrder = sortOrder?.toLowerCase() || 'desc';

  if (!validOrder.includes(parsedOrder)) {
    return { valid: false, error: 'Sort order must be "asc" or "desc"' };
  }

  return { valid: true, sortBy, sortOrder: parsedOrder };
}

/**
 * Create a validation error response
 * @param {string} message
 * @param {string} code
 * @param {object} details
 * @returns {Response}
 */
export function validationErrorResponse(message, code = 'VALIDATION_ERROR', details = null) {
  return new Response(JSON.stringify({
    error: message,
    code,
    details,
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
