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

// Cleanup after each test case
afterEach(() => {
  cleanup();

  // Clear all mocks to prevent test interference
  vi.clearAllMocks();
});
