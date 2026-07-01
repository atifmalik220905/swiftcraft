/**
 * SwiftCart — Webhook Security Utilities
 * HMAC verification for Shopify webhooks and API requests
 *
 * Security principles:
 * - All webhooks must be verified before processing
 * - Never trust requests without HMAC validation
 * - Use constant-time comparison for HMAC
 */

import crypto from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 *
 * @param {string} body - Raw request body as string
 * @param {string} hmac - HMAC from X-Shopify-Hmac-Sha256 header
 * @param {string} apiSecret - Shopify API secret key
 * @returns {boolean} - True if valid
 *
 * @example
 * const isValid = verifyWebhookHmac(rawBody, hmacHeader, SHOPIFY_API_SECRET);
 * if (!isValid) {
 *   return new Response('Invalid signature', { status: 401 });
 * }
 */
export function verifyWebhookHmac(body, hmac, apiSecret) {
  if (!body || !hmac || !apiSecret) {
    return false;
  }

  const computedHmac = crypto
    .createHmac('sha256', apiSecret)
    .update(body, 'utf8')
    .digest('base64');

  return safeCompare(hmac, computedHmac);
}

/**
 * Verify Shopify App Proxy request signature
 *
 * @param {URLSearchParams|string} params - Query parameters
 * @param {string} apiSecret - Shopify API secret key
 * @returns {boolean} - True if valid
 */
export function verifyProxySignature(params, apiSecret) {
  const searchParams = typeof params === 'string'
    ? new URLSearchParams(params)
    : params;

  const signature = searchParams.get('signature');
  if (!signature) {
    return false;
  }

  // Remove signature from params for verification
  const paramsCopy = new URLSearchParams(searchParams);
  paramsCopy.delete('signature');

  // Sort and concatenate parameters
  const pairs = [];
  for (const [key, value] of [...paramsCopy.entries()].sort()) {
    pairs.push(`${key}=${value}`);
  }
  const message = pairs.join('&');

  const computedSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(message, 'utf8')
    .digest('hex');

  return safeCompare(signature, computedSignature);
}

/**
 * Verify Shopify OAuth callback (validate state parameter)
 *
 * @param {string} state - State from OAuth callback
 * @param {string} storedState - State stored during OAuth initiation
 * @returns {boolean} - True if valid
 */
export function verifyOAuthState(state, storedState) {
  if (!state || !storedState) {
    return false;
  }

  return safeCompare(state, storedState);
}

/**
 * Verify Shopify Access Token (validate myshopify domain)
 *
 * @param {string} shop - Shop domain from request
 * @param {string} validShops - List of allowed shop domains (optional)
 * @returns {boolean} - True if valid
 */
export function validateShopDomain(shop, validShops = null) {
  if (!shop) {
    return false;
  }

  // Basic format validation
  const shopPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$/;
  if (!shopPattern.test(shop)) {
    return false;
  }

  // If allowlist provided, check against it
  if (validShops && Array.isArray(validShops)) {
    return validShops.some(s => s.toLowerCase() === shop.toLowerCase());
  }

  return true;
}

/**
 * Safe string comparison (constant-time)
 * Prevents timing attacks
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if equal
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Create buffers for comparison
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  // If lengths differ, still compare to prevent timing attacks
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Generate HMAC for outgoing requests (e.g., to verify origin)
 *
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} - Base64 encoded HMAC
 */
export function generateHmac(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('base64');
}

/**
 * Validate webhook topic matches expected
 *
 * @param {string} topic - Received topic from X-Shopify-Topic header
 * @param {string|string[]} expectedTopics - Expected topic(s)
 * @returns {boolean}
 */
export function validateWebhookTopic(topic, expectedTopics) {
  if (!topic) {
    return false;
  }

  const normalizedTopic = topic.toLowerCase();
  const topics = Array.isArray(expectedTopics)
    ? expectedTopics.map(t => t.toLowerCase())
    : [expectedTopics.toLowerCase()];

  return topics.includes(normalizedTopic);
}

/**
 * Extract Shopify session from App Bridge JWT
 *
 * @param {Request} request - Incoming request
 * @param {object} options - Options
 * @returns {object|null} - Decoded session or null
 */
export function extractSessionFromJwt(request, options = {}) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    // Note: Actual JWT verification should be done by Shopify SDK
    // This is a placeholder for session extraction
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (middle part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

    return {
      shop: payload.dest?.replace('https://', ''),
      sid: payload.sid,
      exp: payload.exp,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Verify HMAC for API requests from storefront widget
 *
 * @param {Request} request - Incoming request
 * @param {string} body - Request body
 * @param {string} secret - Shared secret
 * @returns {boolean}
 */
export function verifyApiRequestHmac(request, body, secret) {
  const timestamp = request.headers.get('X-SwiftCart-Timestamp');
  const signature = request.headers.get('X-SwiftCart-Signature');

  if (!timestamp || !signature) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  // Verify HMAC
  const payload = `${timestamp}.${body}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return safeCompare(signature, computedSignature);
}

/**
 * Create a signed API response
 *
 * @param {object} data - Response data
 * @param {string} secret - Shared secret
 * @returns {object} - Signed response object
 */
export function signApiResponse(data, secret) {
  const timestamp = Date.now().toString();
  const payload = JSON.stringify(data);
  const signature = generateHmac(`${timestamp}.${payload}`, secret);

  return {
    ...data,
    _signature: signature,
    _timestamp: timestamp,
  };
}

/**
 * Webhook handler wrapper with HMAC verification
 *
 * @param {function} handler - Webhook handler function
 * @param {string} apiSecret - Shopify API secret
 * @param {string|string[]} expectedTopics - Expected webhook topics
 * @returns {function} - Wrapped handler
 *
 * @example
 * app.post('/webhooks/orders/create', verifiedWebhookHandler(
 *   async (context) => {
 *     // Handle verified webhook
 *   },
 *   SHOPIFY_API_SECRET,
 *   'orders/create'
 * ));
 */
export function createVerifiedWebhookHandler(handler, apiSecret, expectedTopics) {
  return async ({ request }) => {
    // Get headers
    const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
    const topic = request.headers.get('X-Shopify-Topic');
    const shop = request.headers.get('X-Shopify-Shop-Domain');

    // Validate topic
    if (!validateWebhookTopic(topic, expectedTopics)) {
      console.warn(`[Webhook] Invalid topic: ${topic}`);
      return new Response('Invalid topic', { status: 400 });
    }

    // Get raw body
    const rawBody = await request.text();

    // Verify HMAC
    if (!verifyWebhookHmac(rawBody, hmac, apiSecret)) {
      console.warn(`[Webhook] Invalid HMAC for ${shop}`);
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse body
    const body = JSON.parse(rawBody);

    // Call handler
    try {
      const result = await handler({
        shop,
        topic,
        body,
        request,
      });

      return result || new Response(null, { status: 200 });
    } catch (error) {
      console.error(`[Webhook] Handler error:`, error);
      // Return 200 anyway to prevent Shopify retry
      return new Response(null, { status: 200 });
    }
  };
}

export default {
  verifyWebhookHmac,
  verifyProxySignature,
  verifyOAuthState,
  validateShopDomain,
  safeCompare,
  generateHmac,
  validateWebhookTopic,
  extractSessionFromJwt,
  verifyApiRequestHmac,
  signApiResponse,
  createVerifiedWebhookHandler,
};
