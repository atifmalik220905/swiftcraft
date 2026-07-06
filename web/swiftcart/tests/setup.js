/**
 * SwiftCart — Test Configuration
 * Vitest configuration and setup for unit tests
 */

import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('SHOPIFY_API_KEY', 'test-api-key');
vi.stubEnv('SHOPIFY_API_SECRET', 'test-api-secret');

// Mock Prisma client
vi.mock('../app/db.server', () => ({
  default: {
    merchant: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    upsellRule: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    cartEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  },
}));

// Global test utilities
global.mockRequest = (options = {}) => {
  const {
    method = 'GET',
    url = 'http://localhost:3000',
    headers = {},
    body = null,
  } = options;

  const request = new Request(url, {
    method,
    headers: new Headers(headers),
  });

  if (body && method !== 'GET') {
    Object.defineProperty(request, 'json', {
      value: async () => body,
    });
    Object.defineProperty(request, 'text', {
      value: async () => JSON.stringify(body),
    });
  }

  return request;
};

global.mockContext = (options = {}) => ({
  request: mockRequest(options.request),
  params: options.params || {},
  context: options.context || {},
});
