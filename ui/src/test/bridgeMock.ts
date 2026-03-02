import { vi } from 'vitest';

/**
 * Creates a mock JCEF bridge for use in tests.
 *
 * Usage:
 *   vi.mock('@/bridge/JCEFBridge', () => ({ bridge: createMockBridge() }));
 */
export function createMockBridge() {
  return {
    call: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    once: vi.fn().mockReturnValue(() => {}),
    emit: vi.fn(),
    ready: vi.fn().mockResolvedValue(undefined),
    reportError: vi.fn(),
    dispose: vi.fn(),
  };
}
