/**
 * JCEFBridge tests
 * Verifies window.__jcef_send__/__jcef_receive__ integration, message routing,
 * RPC calls, event subscriptions, and ready-state handshake
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JCEFBridge, createJCEFBridge } from '../../src/bridge/JCEFBridge';
import type {
  BridgeMessage,
  RPCResponse,
  RPCError,
  EventMessage,
  StateUpdateMessage,
  BridgeReadyMessage,
} from '../../src/bridge/types';

describe('JCEFBridge', () => {
  let bridge: JCEFBridge;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock window.__jcef_send__
    mockSend = vi.fn();
    window.__jcef_send__ = mockSend;

    // Create bridge with short timeout for tests
    bridge = new JCEFBridge({ debug: false, readyTimeout: 1000 });

    vi.useFakeTimers();
  });

  afterEach(() => {
    bridge.dispose();
    delete window.__jcef_send__;
    delete window.__jcef_receive__;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should expose window.__jcef_receive__ function', () => {
      expect(typeof window.__jcef_receive__).toBe('function');
    });

    it('should send ready handshake on initialization', () => {
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"bridge:ready"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"source":"react"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"version":"1.0.0"')
      );
    });

    it('should start in initializing state', () => {
      expect(bridge.getState()).toBe('initializing');
      expect(bridge.isReady()).toBe(false);
    });

    it('should accept custom version in options', () => {
      const customBridge = new JCEFBridge({ version: '2.0.0' });
      const calls = mockSend.mock.calls;
      const lastCall = calls[calls.length - 1][0];

      expect(lastCall).toContain('"version":"2.0.0"');

      customBridge.dispose();
    });
  });

  describe('Ready handshake', () => {
    it('should resolve ready promise when IDE sends ready message', async () => {
      const readyMessage: BridgeReadyMessage = {
        type: 'bridge:ready',
        source: 'ide',
        version: '1.0.0',
        timestamp: Date.now(),
      };

      // Simulate IDE ready message
      window.__jcef_receive__!(JSON.stringify(readyMessage));

      await expect(bridge.ready()).resolves.toBeUndefined();
      expect(bridge.getState()).toBe('ready');
      expect(bridge.isReady()).toBe(true);
    });

    it('should timeout if IDE does not respond within readyTimeout', async () => {
      const readyPromise = bridge.ready();

      // Advance timers past ready timeout
      vi.advanceTimersByTime(1000);

      await expect(readyPromise).rejects.toThrow(
        'Bridge ready handshake timed out after 1000ms'
      );
      expect(bridge.getState()).toBe('error');
    });

    it('should ignore ready message from non-IDE source', async () => {
      const readyMessage: BridgeReadyMessage = {
        type: 'bridge:ready',
        source: 'react', // Wrong source
        version: '1.0.0',
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(readyMessage));

      // Should still be initializing
      expect(bridge.getState()).toBe('initializing');
    });
  });

  describe('Message sending (React → IDE)', () => {
    it('should throw error if __jcef_send__ is not available', async () => {
      delete window.__jcef_send__;
      const newBridge = new JCEFBridge({ readyTimeout: 1000 });

      // RPC call will fail when it tries to send the request
      const promise = newBridge.call('getProjectPath', undefined);

      // The error happens asynchronously when send() is called
      await expect(promise).rejects.toThrow('__jcef_send__ is not available');

      newBridge.dispose();
    });

    it('should serialize messages to JSON before sending', async () => {
      mockSend.mockClear();

      bridge.call('getProjectPath', undefined).catch(() => {}); // Suppress unhandled rejection

      expect(mockSend).toHaveBeenCalled();
      const sentMessage = mockSend.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(sentMessage)).not.toThrow();

      const parsed = JSON.parse(sentMessage);
      expect(parsed.type).toBe('rpc_request');
      expect(parsed.method).toBe('getProjectPath');
    });
  });

  describe('Message receiving (IDE → React)', () => {
    it('should parse incoming JSON messages', () => {
      const message: EventMessage = {
        type: 'event',
        event: 'task:updated',
        payload: { taskId: '123', task: {} },
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => {
        window.__jcef_receive__!(JSON.stringify(message));
      }).not.toThrow();
    });

    it('should handle malformed JSON gracefully', () => {
      // Should not throw - just log error and continue
      expect(() => {
        window.__jcef_receive__!('invalid json {{{');
      }).not.toThrow();
    });

    it('should handle messages with unknown types', () => {
      const message = {
        type: 'unknown_type',
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => {
        window.__jcef_receive__!(JSON.stringify(message));
      }).not.toThrow();
    });
  });

  describe('RPC integration', () => {
    beforeEach(async () => {
      // Make bridge ready
      const readyMessage: BridgeReadyMessage = {
        type: 'bridge:ready',
        source: 'ide',
        version: '1.0.0',
        timestamp: Date.now(),
      };
      window.__jcef_receive__!(JSON.stringify(readyMessage));
      await bridge.ready();
      mockSend.mockClear();
    });

    it('should send RPC request via __jcef_send__', () => {
      bridge.call('getProjectPath', undefined).catch(() => {}); // Suppress unhandled rejection

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"rpc_request"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"method":"getProjectPath"')
      );
    });

    it('should resolve RPC call when response is received', async () => {
      const promise = bridge.call('getProjectPath', undefined);

      // Extract request ID from sent message
      const sentMessage = JSON.parse(mockSend.mock.calls[0][0]);
      const requestId = sentMessage.id;

      // Simulate IDE response
      const response: RPCResponse<string> = {
        type: 'rpc_response',
        id: requestId,
        result: '/path/to/project',
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(response));

      const result = await promise;
      expect(result).toBe('/path/to/project');
    });

    it('should reject RPC call when error is received', async () => {
      const promise = bridge.call('getProjectPath', undefined);

      // Extract request ID
      const sentMessage = JSON.parse(mockSend.mock.calls[0][0]);
      const requestId = sentMessage.id;

      // Simulate IDE error
      const error: RPCError = {
        type: 'rpc_error',
        id: requestId,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'No project is currently open',
        },
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(error));

      await expect(promise).rejects.toThrow('No project is currently open');
    });

    it('should support custom timeout for RPC calls', () => {
      bridge.call('getProjectPath', undefined, { timeout: 5000 }).catch(() => {}); // Suppress unhandled rejection

      // Verify RPC handler received the timeout (indirectly via pending count)
      expect(bridge.getRPCHandler().pendingCount()).toBe(1);
    });

    it('should support concurrent RPC calls', async () => {
      const promise1 = bridge.call('getProjectPath', undefined);
      const promise2 = bridge.call('getSelectedFile', undefined);

      expect(mockSend).toHaveBeenCalledTimes(2);

      // Get request IDs
      const req1 = JSON.parse(mockSend.mock.calls[0][0]);
      const req2 = JSON.parse(mockSend.mock.calls[1][0]);

      // Respond to both
      window.__jcef_receive__!(
        JSON.stringify({
          type: 'rpc_response',
          id: req1.id,
          result: '/project',
          timestamp: Date.now(),
        })
      );

      window.__jcef_receive__!(
        JSON.stringify({
          type: 'rpc_response',
          id: req2.id,
          result: '/project/file.ts',
          timestamp: Date.now(),
        })
      );

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1).toBe('/project');
      expect(result2).toBe('/project/file.ts');
    });
  });

  describe('Event subscription', () => {
    it('should receive events from IDE via event bus', () => {
      const handler = vi.fn();
      bridge.on('task:updated', handler);

      const eventMessage: EventMessage = {
        type: 'event',
        event: 'task:updated',
        payload: { taskId: '123', task: { id: '123', title: 'Test' } },
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(eventMessage));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        taskId: '123',
        task: { id: '123', title: 'Test' },
      });
    });

    it('should support multiple event subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.on('user:login', handler1);
      bridge.on('user:login', handler2);

      const eventMessage: EventMessage = {
        type: 'event',
        event: 'user:login',
        payload: { userId: 'user-1', userName: 'John' },
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(eventMessage));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should support unsubscribe from events', () => {
      const handler = vi.fn();
      const unsubscribe = bridge.on('task:created', handler);

      unsubscribe();

      const eventMessage: EventMessage = {
        type: 'event',
        event: 'task:created',
        payload: { taskId: '456', task: {} },
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(eventMessage));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support once() for one-time subscriptions', () => {
      const handler = vi.fn();
      bridge.once('user:logout', handler);

      const eventMessage: EventMessage = {
        type: 'event',
        event: 'user:logout',
        payload: undefined,
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(eventMessage));
      window.__jcef_receive__!(JSON.stringify(eventMessage));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow emitting events from React to IDE', () => {
      mockSend.mockClear();

      bridge.emit('task:updated', { taskId: '789', task: {} });

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"event"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"event":"task:updated"')
      );
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('"taskId":"789"'));
    });
  });

  describe('State synchronization', () => {
    it('should receive state updates from IDE', () => {
      const handler = vi.fn();
      bridge.on('state:update' as any, handler);

      const stateUpdate: StateUpdateMessage = {
        type: 'state:update',
        updates: {
          projectPath: '/new/project',
          selectedFile: '/new/project/file.ts',
        },
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(stateUpdate));

      expect(handler).toHaveBeenCalledWith({
        projectPath: '/new/project',
        selectedFile: '/new/project/file.ts',
      });
    });

    it('should send state changes to IDE via syncState()', () => {
      mockSend.mockClear();

      bridge.syncState({
        selectedFile: '/project/new-file.ts',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"state:sync"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"/project/new-file.ts"')
      );
    });
  });

  describe('Error reporting', () => {
    it('should send error reports to IDE', () => {
      mockSend.mockClear();

      const error = new Error('Component crashed');
      error.stack = 'Error: Component crashed\n  at Component.render';

      bridge.reportError(error, 'error', { component: 'TaskList' });

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error:report"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('Component crashed')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"severity":"error"')
      );
    });

    it('should default to error severity', () => {
      mockSend.mockClear();

      bridge.reportError(new Error('Test error'));

      const sentMessage = JSON.parse(mockSend.mock.calls[0][0]);
      expect(sentMessage.error.severity).toBe('error');
    });
  });

  describe('Ping/Pong', () => {
    it('should respond to ping with pong', () => {
      mockSend.mockClear();

      const pingMessage = {
        type: 'bridge:ping',
        id: 'ping-123',
        timestamp: Date.now(),
      };

      window.__jcef_receive__!(JSON.stringify(pingMessage));

      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"type":"bridge:pong"')
      );
      expect(mockSend).toHaveBeenCalledWith(
        expect.stringContaining('"id":"ping-123"')
      );
      expect(mockSend).toHaveBeenCalledWith(expect.stringContaining('"latency"'));
    });
  });

  describe('Debug mode', () => {
    it('should respect debug option', () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const debugBridge = new JCEFBridge({ debug: true });

      // Debug mode should log
      expect(consoleDebugSpy).toHaveBeenCalled();

      debugBridge.dispose();
      consoleDebugSpy.mockRestore();
    });

    it('should allow changing debug mode at runtime', () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      bridge.setDebug(true);

      // Trigger some operation that logs
      bridge.call('getProjectPath', undefined).catch(() => {}); // Suppress unhandled rejection

      expect(consoleDebugSpy).toHaveBeenCalled();

      consoleDebugSpy.mockRestore();
    });
  });

  describe('Disposal', () => {
    it('should cancel all pending RPC requests on dispose', async () => {
      const promise1 = bridge.call('getProjectPath', undefined);
      const promise2 = bridge.call('getSelectedFile', undefined);

      bridge.dispose();

      // Both promises should be rejected
      await expect(promise1).rejects.toThrow('was cancelled');
      await expect(promise2).rejects.toThrow('was cancelled');
    });

    it('should clear all event handlers on dispose', () => {
      const handler = vi.fn();
      bridge.on('task:updated', handler);

      bridge.dispose();

      // After dispose, __jcef_receive__ is removed, so we can't send messages anymore
      // But we can verify the event bus was cleared
      expect(bridge.getEventBus().listenerCount('task:updated')).toBe(0);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should remove window.__jcef_receive__ on dispose', () => {
      bridge.dispose();

      expect(window.__jcef_receive__).toBeUndefined();
    });
  });

  describe('Factory function', () => {
    it('should create bridge via createJCEFBridge()', () => {
      const newBridge = createJCEFBridge({ debug: false });

      expect(newBridge).toBeInstanceOf(JCEFBridge);
      expect(newBridge.getState()).toBe('initializing');

      newBridge.dispose();
    });
  });

  describe('Advanced usage', () => {
    it('should expose RPC handler for advanced usage', () => {
      const rpcHandler = bridge.getRPCHandler();

      expect(rpcHandler).toBeDefined();
      expect(typeof rpcHandler.call).toBe('function');
    });

    it('should expose event bus for advanced usage', () => {
      const eventBus = bridge.getEventBus();

      expect(eventBus).toBeDefined();
      expect(typeof eventBus.on).toBe('function');
      expect(typeof eventBus.emit).toBe('function');
    });
  });
});
