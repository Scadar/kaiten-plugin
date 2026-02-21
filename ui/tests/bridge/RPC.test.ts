/**
 * RPC handler tests
 * Verifies request/response matching, timeout handling, concurrent calls, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RPCHandler,
  createRPCHandler,
  RPCTimeoutError,
  RPCRemoteError,
} from '../../src/bridge/RPC';
import type { RPCResponse, RPCError } from '../../src/bridge/types';

describe('RPCHandler', () => {
  let rpc: RPCHandler;

  beforeEach(() => {
    rpc = new RPCHandler();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('call() - Basic RPC calls', () => {
    it('should create RPC request with UUID and emit it', () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      rpc.call('getProjectPath', undefined);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.any(String), // UUID
        'getProjectPath',
        undefined
      );

      // Verify UUID format (basic check)
      const uuid = emitSpy.mock.calls[0][0];
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should resolve promise when response is received', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);

      // Get the request ID from the emit call
      const requestId = emitSpy.mock.calls[0][0];

      // Simulate IDE response
      const response: RPCResponse<string> = {
        type: 'rpc_response',
        id: requestId,
        result: '/path/to/project',
        timestamp: Date.now(),
      };

      rpc.handleResponse(response);

      const result = await promise;
      expect(result).toBe('/path/to/project');
    });

    it('should track pending requests', () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      expect(rpc.pendingCount()).toBe(0);

      rpc.call('getProjectPath', undefined);
      expect(rpc.pendingCount()).toBe(1);

      rpc.call('getSelectedFile', undefined);
      expect(rpc.pendingCount()).toBe(2);
    });

    it('should remove pending request after response', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);
      expect(rpc.pendingCount()).toBe(1);

      const requestId = emitSpy.mock.calls[0][0];
      const response: RPCResponse<string> = {
        type: 'rpc_response',
        id: requestId,
        result: '/path/to/project',
        timestamp: Date.now(),
      };

      rpc.handleResponse(response);
      await promise;

      expect(rpc.pendingCount()).toBe(0);
    });
  });

  describe('handleResponse() - Response handling', () => {
    it('should handle response with correct UUID', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getState', undefined);
      const requestId = emitSpy.mock.calls[0][0];

      const state = {
        projectPath: '/test',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const response: RPCResponse = {
        type: 'rpc_response',
        id: requestId,
        result: state,
        timestamp: Date.now(),
      };

      rpc.handleResponse(response);

      const result = await promise;
      expect(result).toEqual(state);
    });

    it('should ignore response for unknown request ID', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const response: RPCResponse = {
        type: 'rpc_response',
        id: 'unknown-uuid',
        result: 'test',
        timestamp: Date.now(),
      };

      rpc.handleResponse(response);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown RPC request')
      );
    });

    it('should handle multiple responses in order', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise1 = rpc.call('getProjectPath', undefined);
      const promise2 = rpc.call('getSelectedFile', undefined);

      const id1 = emitSpy.mock.calls[0][0];
      const id2 = emitSpy.mock.calls[1][0];

      // Respond in reverse order
      rpc.handleResponse({
        type: 'rpc_response',
        id: id2,
        result: '/file2.ts',
        timestamp: Date.now(),
      });

      rpc.handleResponse({
        type: 'rpc_response',
        id: id1,
        result: '/project',
        timestamp: Date.now(),
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('/project');
      expect(result2).toBe('/file2.ts');
    });
  });

  describe('handleError() - Error handling', () => {
    it('should reject promise when error is received', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getTasks', { filters: {} });
      const requestId = emitSpy.mock.calls[0][0];

      const error: RPCError = {
        type: 'rpc_error',
        id: requestId,
        error: {
          code: 'NOT_FOUND',
          message: 'Tasks not found',
          details: { reason: 'No tasks available' },
        },
        timestamp: Date.now(),
      };

      rpc.handleError(error);

      await expect(promise).rejects.toThrow(RPCRemoteError);
      await expect(promise).rejects.toThrow('Tasks not found');
    });

    it('should include error code and details in RPCRemoteError', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getTask', { id: '123' });
      const requestId = emitSpy.mock.calls[0][0];

      const error: RPCError = {
        type: 'rpc_error',
        id: requestId,
        error: {
          code: 'INVALID_ID',
          message: 'Task ID is invalid',
          details: { id: '123', expected: 'numeric' },
        },
        timestamp: Date.now(),
      };

      rpc.handleError(error);

      try {
        await promise;
        expect.fail('Should have thrown error');
      } catch (e) {
        expect(e).toBeInstanceOf(RPCRemoteError);
        const remoteError = e as RPCRemoteError;
        expect(remoteError.code).toBe('INVALID_ID');
        expect(remoteError.message).toBe('Task ID is invalid');
        expect(remoteError.details).toEqual({ id: '123', expected: 'numeric' });
      }
    });

    it('should ignore error for unknown request ID', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error: RPCError = {
        type: 'rpc_error',
        id: 'unknown-uuid',
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
        timestamp: Date.now(),
      };

      rpc.handleError(error);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('unknown RPC request')
      );
    });

    it('should remove pending request after error', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getCurrentUser', undefined);
      expect(rpc.pendingCount()).toBe(1);

      const requestId = emitSpy.mock.calls[0][0];
      const error: RPCError = {
        type: 'rpc_error',
        id: requestId,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: Date.now(),
      };

      rpc.handleError(error);

      await expect(promise).rejects.toThrow();
      expect(rpc.pendingCount()).toBe(0);
    });
  });

  describe('Timeout handling', () => {
    it('should timeout RPC call with default timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);

      // Fast-forward time by default timeout (30s)
      vi.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow(RPCTimeoutError);
      await expect(promise).rejects.toThrow('timed out after 30000ms');
    });

    it('should timeout RPC call with custom timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 5000 });

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow(RPCTimeoutError);
      await expect(promise).rejects.toThrow('timed out after 5000ms');
    });

    it('should not timeout if response arrives before timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 10000 });

      // Fast-forward by 5 seconds (before timeout)
      vi.advanceTimersByTime(5000);

      const requestId = emitSpy.mock.calls[0][0];
      rpc.handleResponse({
        type: 'rpc_response',
        id: requestId,
        result: '/project',
        timestamp: Date.now(),
      });

      const result = await promise;
      expect(result).toBe('/project');
    });

    it('should remove pending request after timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 5000 });
      expect(rpc.pendingCount()).toBe(1);

      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow(RPCTimeoutError);
      expect(rpc.pendingCount()).toBe(0);
    });

    it('should clear timeout after response', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 10000 });
      const requestId = emitSpy.mock.calls[0][0];

      // Response arrives immediately
      rpc.handleResponse({
        type: 'rpc_response',
        id: requestId,
        result: '/project',
        timestamp: Date.now(),
      });

      await promise;

      // Fast-forward beyond timeout - should not throw
      vi.advanceTimersByTime(20000);

      // No error should be thrown
      expect(rpc.pendingCount()).toBe(0);
    });

    it('should support custom default timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      rpc.setDefaultTimeout(15000);

      const promise = rpc.call('getProjectPath', undefined);

      vi.advanceTimersByTime(10000); // Before timeout
      expect(rpc.pendingCount()).toBe(1);

      vi.advanceTimersByTime(5000); // After timeout (15s total)
      await expect(promise).rejects.toThrow('timed out after 15000ms');
    });

    it('should throw error if setting invalid timeout', () => {
      expect(() => rpc.setDefaultTimeout(0)).toThrow('must be greater than 0');
      expect(() => rpc.setDefaultTimeout(-1000)).toThrow('must be greater than 0');
    });
  });

  describe('cancel() - Request cancellation', () => {
    it('should cancel pending request by ID', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);
      const requestId = emitSpy.mock.calls[0][0];

      const cancelled = rpc.cancel(requestId);
      expect(cancelled).toBe(true);

      await expect(promise).rejects.toThrow('was cancelled');
      expect(rpc.pendingCount()).toBe(0);
    });

    it('should return false when cancelling unknown request', () => {
      const cancelled = rpc.cancel('unknown-uuid');
      expect(cancelled).toBe(false);
    });

    it('should clear timeout when cancelling', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 10000 });
      const requestId = emitSpy.mock.calls[0][0];

      rpc.cancel(requestId);

      // Fast-forward beyond timeout
      vi.advanceTimersByTime(20000);

      // Should only get cancellation error, not timeout error
      await expect(promise).rejects.toThrow('was cancelled');
      await expect(promise).rejects.not.toThrow('timed out');
    });
  });

  describe('cancelAll() - Cancel all requests', () => {
    it('should cancel all pending requests', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise1 = rpc.call('getProjectPath', undefined);
      const promise2 = rpc.call('getSelectedFile', undefined);
      const promise3 = rpc.call('getCurrentUser', undefined);

      expect(rpc.pendingCount()).toBe(3);

      const cancelled = rpc.cancelAll();
      expect(cancelled).toBe(3);
      expect(rpc.pendingCount()).toBe(0);

      await expect(promise1).rejects.toThrow('was cancelled');
      await expect(promise2).rejects.toThrow('was cancelled');
      await expect(promise3).rejects.toThrow('was cancelled');
    });

    it('should return 0 when cancelling with no pending requests', () => {
      const cancelled = rpc.cancelAll();
      expect(cancelled).toBe(0);
    });
  });

  describe('Concurrent RPC calls', () => {
    it('should handle multiple concurrent RPC calls independently', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise1 = rpc.call('getProjectPath', undefined);
      const promise2 = rpc.call('getSelectedFile', undefined);
      const promise3 = rpc.call('getCurrentUser', undefined);

      expect(rpc.pendingCount()).toBe(3);

      const id1 = emitSpy.mock.calls[0][0];
      const id2 = emitSpy.mock.calls[1][0];
      const id3 = emitSpy.mock.calls[2][0];

      // Verify all IDs are unique
      expect(new Set([id1, id2, id3]).size).toBe(3);

      // Respond to each request
      rpc.handleResponse({
        type: 'rpc_response',
        id: id1,
        result: '/project',
        timestamp: Date.now(),
      });

      rpc.handleResponse({
        type: 'rpc_response',
        id: id2,
        result: '/file.ts',
        timestamp: Date.now(),
      });

      rpc.handleResponse({
        type: 'rpc_response',
        id: id3,
        result: { id: '1', name: 'John', email: 'john@example.com' },
        timestamp: Date.now(),
      });

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toBe('/project');
      expect(result2).toBe('/file.ts');
      expect(result3).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
    });

    it('should handle mix of successful and failed concurrent calls', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise1 = rpc.call('getProjectPath', undefined);
      const promise2 = rpc.call('getTasks', { filters: {} });

      const id1 = emitSpy.mock.calls[0][0];
      const id2 = emitSpy.mock.calls[1][0];

      rpc.handleResponse({
        type: 'rpc_response',
        id: id1,
        result: '/project',
        timestamp: Date.now(),
      });

      rpc.handleError({
        type: 'rpc_error',
        id: id2,
        error: {
          code: 'NOT_FOUND',
          message: 'No tasks found',
        },
        timestamp: Date.now(),
      });

      const result1 = await promise1;
      expect(result1).toBe('/project');

      await expect(promise2).rejects.toThrow('No tasks found');
    });

    it('should handle concurrent calls with different timeouts', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise1 = rpc.call('getProjectPath', undefined, { timeout: 5000 });
      const promise2 = rpc.call('getSelectedFile', undefined, { timeout: 10000 });

      // Fast-forward by 5 seconds
      vi.advanceTimersByTime(5000);

      // First call should timeout
      await expect(promise1).rejects.toThrow(RPCTimeoutError);
      expect(rpc.pendingCount()).toBe(1); // Second call still pending

      // Respond to second call
      const id2 = emitSpy.mock.calls[1][0];
      rpc.handleResponse({
        type: 'rpc_response',
        id: id2,
        result: '/file.ts',
        timestamp: Date.now(),
      });

      const result2 = await promise2;
      expect(result2).toBe('/file.ts');
    });
  });

  describe('Utility methods', () => {
    it('pendingCount() should return correct count', () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      expect(rpc.pendingCount()).toBe(0);

      rpc.call('getProjectPath', undefined);
      expect(rpc.pendingCount()).toBe(1);

      rpc.call('getSelectedFile', undefined);
      expect(rpc.pendingCount()).toBe(2);

      rpc.call('getCurrentUser', undefined);
      expect(rpc.pendingCount()).toBe(3);
    });

    it('pendingRequestIds() should return list of pending IDs', () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      expect(rpc.pendingRequestIds()).toEqual([]);

      rpc.call('getProjectPath', undefined);
      rpc.call('getSelectedFile', undefined);

      const ids = rpc.pendingRequestIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(emitSpy.mock.calls[0][0]);
      expect(ids).toContain(emitSpy.mock.calls[1][0]);
    });

    it('getPendingRequest() should return request details', () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      rpc.call('getProjectPath', undefined);
      const requestId = emitSpy.mock.calls[0][0];

      const details = rpc.getPendingRequest(requestId);
      expect(details).toEqual({ method: 'getProjectPath' });
    });

    it('getPendingRequest() should return undefined for unknown ID', () => {
      const details = rpc.getPendingRequest('unknown-uuid');
      expect(details).toBeUndefined();
    });

    it('getDefaultTimeout() should return current default timeout', () => {
      expect(rpc.getDefaultTimeout()).toBe(30000);

      rpc.setDefaultTimeout(15000);
      expect(rpc.getDefaultTimeout()).toBe(15000);
    });
  });

  describe('createRPCHandler() factory', () => {
    it('should create a new RPCHandler instance', () => {
      const handler = createRPCHandler();
      expect(handler).toBeInstanceOf(RPCHandler);
    });

    it('should create independent instances', async () => {
      const handler1 = createRPCHandler();
      const handler2 = createRPCHandler();

      const emit1 = vi.fn();
      const emit2 = vi.fn();

      handler1.setRequestEmitter(emit1);
      handler2.setRequestEmitter(emit2);

      handler1.call('getProjectPath', undefined);
      handler2.call('getSelectedFile', undefined);

      expect(emit1).toHaveBeenCalledTimes(1);
      expect(emit2).toHaveBeenCalledTimes(1);
      expect(handler1.pendingCount()).toBe(1);
      expect(handler2.pendingCount()).toBe(1);
    });
  });

  describe('Memory leak prevention', () => {
    it('should clean up pending requests after response', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);
      const requestId = emitSpy.mock.calls[0][0];

      expect(rpc.pendingRequestIds()).toContain(requestId);

      rpc.handleResponse({
        type: 'rpc_response',
        id: requestId,
        result: '/project',
        timestamp: Date.now(),
      });

      await promise;

      expect(rpc.pendingRequestIds()).not.toContain(requestId);
      expect(rpc.getPendingRequest(requestId)).toBeUndefined();
    });

    it('should clean up pending requests after error', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getTasks', { filters: {} });
      const requestId = emitSpy.mock.calls[0][0];

      rpc.handleError({
        type: 'rpc_error',
        id: requestId,
        error: { code: 'ERROR', message: 'Test error' },
        timestamp: Date.now(),
      });

      await expect(promise).rejects.toThrow();

      expect(rpc.pendingRequestIds()).not.toContain(requestId);
      expect(rpc.getPendingRequest(requestId)).toBeUndefined();
    });

    it('should clean up pending requests after timeout', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined, { timeout: 5000 });
      const requestId = emitSpy.mock.calls[0][0];

      vi.advanceTimersByTime(5000);

      await expect(promise).rejects.toThrow(RPCTimeoutError);

      expect(rpc.pendingRequestIds()).not.toContain(requestId);
      expect(rpc.getPendingRequest(requestId)).toBeUndefined();
    });

    it('should clean up pending requests after cancellation', async () => {
      const emitSpy = vi.fn();
      rpc.setRequestEmitter(emitSpy);

      const promise = rpc.call('getProjectPath', undefined);
      const requestId = emitSpy.mock.calls[0][0];

      rpc.cancel(requestId);

      await expect(promise).rejects.toThrow('was cancelled');

      expect(rpc.pendingRequestIds()).not.toContain(requestId);
      expect(rpc.getPendingRequest(requestId)).toBeUndefined();
    });
  });
});
