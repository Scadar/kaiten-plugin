/**
 * RPC Flow Integration Tests
 *
 * These tests verify the end-to-end RPC communication flow:
 * 1. React calls bridge.call(method, params)
 * 2. IDE receives RPC request
 * 3. IDE executes handler and returns result
 * 4. React receives response
 *
 * Note: These tests require a mock bridge since we can't run a real IDE in tests.
 * In production, manual testing in the IDE is required for full verification.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createJCEFBridge } from '@/bridge/JCEFBridge';

describe('RPC Call Flow', () => {
  // Track all bridge instances created during tests
  const bridges: ReturnType<typeof createJCEFBridge>[] = [];

  beforeEach(() => {
    // Clear any previous mocks
    vi.clearAllMocks();

    // Clear window functions
    delete (window as any).__jcef_send__;
    delete (window as any).__jcef_receive__;
  });

  afterEach(() => {
    // Dispose all bridges to prevent unhandled promise rejections
    bridges.forEach((bridge) => {
      try {
        bridge.dispose();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    // Clear the bridges array
    bridges.length = 0;
  });

  describe('React → IDE → React flow', () => {
    let sendMock: ReturnType<typeof vi.fn>;
    let bridge: ReturnType<typeof createJCEFBridge>;
    let receiveFunction: (message: string) => void;

    beforeEach(async () => {
      sendMock = vi.fn();
      (window as any).__jcef_send__ = sendMock;

      bridge = createJCEFBridge({ debug: false });
      bridges.push(bridge);

      receiveFunction = (window as any).__jcef_receive__;
      receiveFunction(
        JSON.stringify({
          type: 'bridge:ready',
          source: 'ide',
          version: '1.0.0',
          timestamp: Date.now(),
        }),
      );

      await bridge.ready();
    });

    it('should send RPC request and receive response', async () => {
      expect(receiveFunction).toBeDefined();

      // Make RPC call
      const callPromise = bridge.call('getProjectPath', undefined);

      // Verify RPC request was sent
      expect(sendMock).toHaveBeenCalled();
      const sentMessage = JSON.parse(sendMock.mock.calls[sendMock.mock.calls.length - 1]![0] as string);
      expect(sentMessage.type).toBe('rpc_request');
      expect(sentMessage.method).toBe('getProjectPath');
      expect(sentMessage.id).toBeDefined();

      // Simulate IDE response
      receiveFunction(
        JSON.stringify({
          type: 'rpc_response',
          id: sentMessage.id,
          result: '/path/to/project',
          timestamp: Date.now(),
        }),
      );

      // Wait for response
      const result = await callPromise;

      // Verify result
      expect(result).toBe('/path/to/project');
    });

    it('should handle multiple concurrent RPC calls', async () => {
      // Make multiple RPC calls
      const call1 = bridge.call('getProjectPath', undefined);
      const call2 = bridge.call('getSettings', undefined);
      const call3 = bridge.call('getSelectedFile', undefined);

      // Verify all requests were sent
      expect(sendMock).toHaveBeenCalledTimes(4); // 1 ready + 3 RPC requests

      // Extract request IDs
      const messages = sendMock.mock.calls
        .map((call: any[]) => JSON.parse(call[0]))
        .filter((msg: any) => msg.type === 'rpc_request');

      expect(messages).toHaveLength(3);

      const id1 = messages[0].id;
      const id2 = messages[1].id;
      const id3 = messages[2].id;

      // Simulate IDE responses (in different order)
      receiveFunction(
        JSON.stringify({
          type: 'rpc_response',
          id: id2,
          result: { theme: 'dark' },
          timestamp: Date.now(),
        }),
      );

      receiveFunction(
        JSON.stringify({
          type: 'rpc_response',
          id: id1,
          result: '/path/to/project',
          timestamp: Date.now(),
        }),
      );

      receiveFunction(
        JSON.stringify({
          type: 'rpc_response',
          id: id3,
          result: '/path/to/selected-file.ts',
          timestamp: Date.now(),
        }),
      );

      // Wait for all responses
      const [result1, result2, result3] = await Promise.all([call1, call2, call3]);

      // Verify results match the correct requests
      expect(result1).toBe('/path/to/project');
      expect(result2).toEqual({ theme: 'dark' });
      expect(result3).toBe('/path/to/selected-file.ts');
    });

    it('should handle RPC errors from IDE', async () => {
      // Make RPC call
      const callPromise = bridge.call('getProjectPath', undefined);

      // Get request ID
      const sentMessage = JSON.parse(sendMock.mock.calls[sendMock.mock.calls.length - 1]![0] as string);

      // Simulate IDE error response
      receiveFunction(
        JSON.stringify({
          type: 'rpc_error',
          id: sentMessage.id,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'No project is currently open',
          },
          timestamp: Date.now(),
        }),
      );

      // Verify error is thrown
      const caughtError = await callPromise.catch((e: unknown) => e);
      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toContain('No project is currently open');
    });

    it('should timeout if IDE does not respond', async () => {
      // Make RPC call with short timeout
      const callPromise = bridge.call('getProjectPath', undefined, { timeout: 100 });

      // Don't send response - let it timeout

      // Verify timeout error
      const caughtError = await callPromise.catch((e: unknown) => e);
      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error).message).toContain('timed out');
    });
  });

  describe('Type safety', () => {
    it('should enforce type-safe RPC method calls', () => {
      // This test verifies TypeScript type checking at compile time
      // If this compiles, type safety is working

      // Mock __jcef_send__ to prevent errors
      (window as any).__jcef_send__ = vi.fn();

      const bridge = createJCEFBridge({ debug: false });
      bridges.push(bridge);

      // These should compile (valid methods)
      // We don't await these - just checking they compile
      // Suppress unhandled rejections by catching them
      bridge.call('getProjectPath', undefined).catch(() => {});
      bridge.call('getSettings', undefined).catch(() => {});
      bridge.call('getSelectedFile', undefined).catch(() => {});

      // TypeScript should catch invalid methods at compile time
      // Uncomment to test:
      // bridge.call('invalidMethod', undefined); // Should error
      // bridge.call('getProjectPath', 'wrong-params'); // Should error
    });
  });
});
