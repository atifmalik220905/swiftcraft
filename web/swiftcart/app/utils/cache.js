/**
 * SwiftCart — Caching Layer
 * Redis-backed caching with in-memory fallback for development
 *
 * For production, set REDIS_URL environment variable.
 * Falls back to in-memory LRU cache when Redis is unavailable.
 */

/**
 * LRU Cache implementation for development/fallback
 */
class LRUCache {
  constructor(maxSize = 1000, defaultTtlMs = 60000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    const expiresAt = Date.now() + ttlMs;

    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { value, expiresAt });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// In-memory cache instance
const memoryCache = new LRUCache(2000, 30000);

// Cleanup interval (every 5 minutes)
setInterval(() => memoryCache.cleanup(), 300000);

// Redis client (lazy load)
let redisClient = null;
let redisAvailable = false;

/**
 * Initialize Redis client
 * Call once at app startup (optional)
 */
export async function initRedis(redisUrl) {
  if (!redisUrl) {
    console.log("[SwiftCart] No Redis URL, using in-memory cache");
    redisAvailable = false;
    return false;
  }

  try {
    // Dynamically import ioredis (won't fail if not installed)
    const Redis = (await import("ioredis")).default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 2000,
    });

    // Test connection
    await redisClient.ping();
    redisAvailable = true;
    console.log("[SwiftCart] Redis cache connected");

    // Handle errors gracefully
    redisClient.on("error", (err) => {
      console.warn("[SwiftCart] Redis error, falling back to memory:", err.message);
      redisAvailable = false;
    });

    redisClient.on("close", () => {
      redisAvailable = false;
    });

    return true;
  } catch (err) {
    console.warn("[SwiftCart] Redis unavailable, using in-memory cache:", err.message);
    redisAvailable = false;
    return false;
  }
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} - Cached value or null
 */
export async function cacheGet(key) {
  // Try Redis first (if available)
  if (redisAvailable && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value !== null) {
        return JSON.parse(value);
      }
      return null;
    } catch (err) {
      console.warn("[SwiftCart] Redis get failed:", err.message);
      // Fall through to memory cache
    }
  }

  // Memory cache fallback
  return memoryCache.get(key);
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (must be JSON-serializable)
 * @param {number} ttlMs - Time to live in milliseconds (default: 30s)
 */
export async function cacheSet(key, value, ttlMs = 30000) {
  // Try Redis first
  if (redisAvailable && redisClient) {
    try {
      await redisClient.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(value));
      return;
    } catch (err) {
      console.warn("[SwiftCart] Redis set failed:", err.message);
    }
  }

  // Memory cache fallback
  memoryCache.set(key, value, ttlMs);
}

/**
 * Delete a key from cache
 * @param {string} key - Cache key
 */
export async function cacheDelete(key) {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn("[SwiftCart] Redis del failed:", err.message);
    }
  }

  memoryCache.delete(key);
}

/**
 * Delete all keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., "merchant:shop:*")
 */
export async function cacheDeletePattern(pattern) {
  if (redisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      console.warn("[SwiftCart] Redis pattern delete failed:", err.message);
    }
  }

  // Memory cache: iterate and delete matching
  for (const key of memoryCache.cache.keys()) {
    if (key.startsWith(pattern.replace("*", ""))) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Cache-aside pattern: get or compute
 * @param {string} key - Cache key
 * @param {function} compute - Async function to compute value if not cached
 * @param {number} ttlMs - Cache TTL in milliseconds
 * @returns {Promise<any>} - Cached or computed value
 */
export async function cacheGetOrCompute(key, compute, ttlMs = 30000) {
  const cached = await cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  const value = await compute();
  await cacheSet(key, value, ttlMs);
  return value;
}

/**
 * Generate cache key for merchant config
 */
export function merchantConfigKey(shopDomain) {
  return `merchant:${shopDomain}:config`;
}

/**
 * Generate cache key for cart evaluation
 */
export function cartEvaluationKey(shopDomain, cartHash) {
  return `eval:${shopDomain}:${cartHash}`;
}

/**
 * Simple hash function for cart state
 * Creates a deterministic hash from cart items
 */
export function hashCart(cart) {
  if (!cart || !cart.items || cart.items.length === 0) {
    return "empty";
  }

  const relevant = cart.items.map((item) => ({
    id: item.product_id || item.id,
    qty: item.quantity || 1,
    tags: item.properties?._tags || "",
  }));

  // Simple but fast hash
  const str = JSON.stringify(relevant);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Invalidate all cached data for a shop
 * Call this when merchant settings change
 */
export async function invalidateShopCache(shopDomain) {
  await cacheDeletePattern(`merchant:${shopDomain}:*`);
  await cacheDeletePattern(`eval:${shopDomain}:*`);
}

/**
 * Get cache stats (for monitoring)
 */
export function getCacheStats() {
  return {
    memorySize: memoryCache.size(),
    redisAvailable,
  };
}

export default {
  initRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheGetOrCompute,
  merchantConfigKey,
  cartEvaluationKey,
  hashCart,
  invalidateShopCache,
  getCacheStats,
};
