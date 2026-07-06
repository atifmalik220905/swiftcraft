/**
 * SwiftCart — Rate Limiting Middleware
 * In-memory rate limiting with Redis-ready interface
 *
 * Usage:
 * - Apply to API routes for protection against abuse
 * - Configurable limits per endpoint
 * - Returns 429 with Retry-After header when exceeded
 */

/**
 * In-memory rate limiter
 * For production, replace with Redis-based implementation
 */
class MemoryRateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Check if a request is allowed
   * @param {string} key - Unique identifier (e.g., shop domain, IP)
   * @param {number} limit - Maximum requests per window
   * @param {number} windowMs - Window size in milliseconds
   * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
   */
  check(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this key
    let requests = this.requests.get(key) || [];

    // Filter to only requests in current window
    requests = requests.filter(t => t > windowStart);

    // Check limit
    const currentCount = requests.length;
    const allowed = currentCount < limit;

    if (allowed) {
      // Add this request
      requests.push(now);
      this.requests.set(key, requests);
    }

    // Calculate reset time
    const oldestRequest = requests.length > 0 ? Math.min(...requests) : now;
    const resetAt = oldestRequest + windowMs;

    return {
      allowed,
      remaining: Math.max(0, limit - currentCount - (allowed ? 1 : 0)),
      resetAt,
      retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000),
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, timestamps] of this.requests.entries()) {
      // Remove entries with no recent requests
      const recent = timestamps.filter(t => now - t < maxAge);
      if (recent.length === 0) {
        this.requests.delete(key);
      } else if (recent.length !== timestamps.length) {
        this.requests.set(key, recent);
      }
    }
  }

  /**
   * Reset rate limit for a key (admin use)
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Get current request count for a key
   */
  getCount(key, windowMs) {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    return requests.filter(t => t > now - windowMs).length;
  }
}

// Singleton instance
const rateLimiter = new MemoryRateLimiter();

/**
 * Rate limit configuration presets
 */
export const RATE_LIMIT_PRESETS = {
  // Cart evaluation - high frequency, critical path
  CART_EVALUATE: { limit: 60, windowMs: 60000 }, // 60/minute

  // Analytics event tracking
  CART_EVENT: { limit: 120, windowMs: 60000 }, // 120/minute

  // Settings updates
  SETTINGS_UPDATE: { limit: 30, windowMs: 60000 }, // 30/minute

  // Admin routes (more restrictive)
  ADMIN: { limit: 30, windowMs: 60000 }, // 30/minute

  // Billing (very restrictive)
  BILLING: { limit: 10, windowMs: 60000 }, // 10/minute

  // Webhooks (per shop)
  WEBHOOK: { limit: 100, windowMs: 60000 }, // 100/minute

  // Global (fallback)
  GLOBAL: { limit: 100, windowMs: 60000 }, // 100/minute
};

/**
 * Create rate limit headers
 */
function createRateLimitHeaders(result, limit) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
    ...(result.retryAfter > 0 ? { 'Retry-After': String(result.retryAfter) } : {}),
  };
}

/**
 * Rate limit middleware factory
 * @param {object} config - Rate limit configuration
 * @param {number} config.limit - Max requests per window
 * @param {number} config.windowMs - Window in milliseconds
 * @param {function} config.keyGenerator - Function to generate rate limit key
 * @returns {function} - Middleware function
 *
 * @example
 * // Apply to specific route
 * export const action = rateLimitMiddleware(RATE_LIMIT_PRESETS.CART_EVALUATE)(async ({ request }) => {
 *   // Handler code
 * });
 */
export function createRateLimiter(config) {
  const { limit, windowMs, keyGenerator = defaultKeyGenerator } = config;

  return (handler) => {
    return async (context) => {
      const { request } = context;
      const key = await keyGenerator(request, context);

      const result = rateLimiter.check(key, limit, windowMs);

      // Add rate limit headers to all responses
      const originalResponse = await handler(context);

      // If rate limited, return 429
      if (!result.allowed) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
          retryAfter: result.retryAfter,
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(result, limit),
          },
        });
      }

      // Add rate limit headers to successful response
      const headers = new Headers(originalResponse.headers);
      Object.entries(createRateLimitHeaders(result, limit)).forEach(([k, v]) => {
        headers.set(k, v);
      });

      return new Response(originalResponse.body, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers,
      });
    };
  };
}

/**
 * Default key generator - uses shop domain or IP
 */
async function defaultKeyGenerator(request, context) {
  // Try to get shop domain from body
  if (request.method === 'POST') {
    try {
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      if (body.shopDomain) {
        return `shop:${body.shopDomain}`;
      }
      if (body.shop) {
        return `shop:${body.shop}`;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Fallback to IP
  const ip = request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || request.headers.get('X-Real-IP')
    || 'unknown';

  return `ip:${ip}`;
}

/**
 * Simple rate limit check (non-middleware)
 * Use for inline rate limiting within handlers
 *
 * @param {string} key - Rate limit key
 * @param {object} preset - Rate limit configuration
 * @returns {{ allowed: boolean, headers: object }}
 */
export function checkRateLimit(key, preset) {
  const { limit, windowMs } = preset || RATE_LIMIT_PRESETS.GLOBAL;
  const result = rateLimiter.check(key, limit, windowMs);

  return {
    allowed: result.allowed,
    retryAfter: result.retryAfter,
    headers: createRateLimitHeaders(result, limit),
  };
}

/**
 * Rate limit a function call
 * @param {string} key - Rate limit key
 * @param {object} preset - Rate limit configuration
 * @param {function} fn - Function to call if allowed
 * @returns {any} - Result of function or 429 Response
 */
export async function withRateLimit(key, preset, fn) {
  const check = checkRateLimit(key, preset);

  if (!check.allowed) {
    return new Response(JSON.stringify({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryAfter: check.retryAfter,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...check.headers,
      },
    });
  }

  return fn();
}

/**
 * Create a rate-limited response helper
 * For use in route handlers
 */
export function rateLimitedResponse(retryAfter = 60) {
  return new Response(JSON.stringify({
    error: 'Rate limit exceeded',
    code: 'RATE_LIMIT',
    retryAfter,
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  });
}

/**
 * Reset rate limit for a shop (admin use)
 * @param {string} shopDomain
 */
export function resetShopRateLimit(shopDomain) {
  rateLimiter.reset(`shop:${shopDomain}`);
}

/**
 * Get current rate limit status for a shop
 * @param {string} shopDomain
 * @param {object} preset
 * @returns {{ count: number, limit: number, remaining: number }}
 */
export function getRateLimitStatus(shopDomain, preset = RATE_LIMIT_PRESETS.CART_EVALUATE) {
  const key = `shop:${shopDomain}`;
  const count = rateLimiter.getCount(key, preset.windowMs);
  return {
    count,
    limit: preset.limit,
    remaining: Math.max(0, preset.limit - count),
  };
}

export default {
  RATE_LIMIT_PRESETS,
  createRateLimiter,
  checkRateLimit,
  withRateLimit,
  rateLimitedResponse,
  resetShopRateLimit,
  getRateLimitStatus,
};
