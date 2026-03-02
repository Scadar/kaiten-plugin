/**
 * Vitest setup file
 * Runs before all tests
 */

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock JCEF bridge functions globally to prevent "not available" errors
// Individual tests can override these mocks as needed
if (typeof window !== 'undefined') {
  (window as any).__jcef_send__ = vi.fn();
  (window as any).__jcef_receive__ = vi.fn();
}

// Polyfill crypto.randomUUID for happy-dom (not available in jsdom-like environments).
// Uses a counter to guarantee uniqueness across all calls — a static 'test-uuid' would
// cause concurrent-call tests to overwrite each other in the pendingRequests map.
let _uuidSeq = 0;
vi.stubGlobal('crypto', {
  randomUUID: (): `${string}-${string}-${string}-${string}-${string}` => {
    const n = String(++_uuidSeq).padStart(12, '0');
    return `00000000-0000-4000-8000-${n}`;
  },
});

// Cleanup after each test case
afterEach(() => {
  cleanup();

  // Clear all mocks to prevent test interference
  vi.clearAllMocks();
});
