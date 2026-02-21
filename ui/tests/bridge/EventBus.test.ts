/**
 * EventBus tests
 * Verifies event emission, subscription, unsubscription, and memory leak prevention
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, createEventBus } from '../../src/bridge/EventBus';
import type { EventName, EventPayload } from '../../src/bridge/types';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() - Event subscription', () => {
    it('should subscribe to events and receive emitted payloads', () => {
      const handler = vi.fn();
      const payload: EventPayload<'task:updated'> = {
        taskId: '123',
        task: { id: '123', title: 'Test Task' },
      };

      eventBus.on('task:updated', handler);
      eventBus.emit('task:updated', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple subscribers to the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const payload: EventPayload<'task:created'> = {
        taskId: '456',
        task: { id: '456', title: 'New Task' },
      };

      eventBus.on('task:created', handler1);
      eventBus.on('task:created', handler2);
      eventBus.emit('task:created', payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledWith(payload);
    });

    it('should return an unsubscribe function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('user:login', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should not call handler for different events', () => {
      const handler = vi.fn();

      eventBus.on('task:updated', handler);
      eventBus.emit('task:created', { taskId: '123', task: {} });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once() - One-time subscription', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();
      const payload: EventPayload<'user:login'> = {
        userId: 'user-1',
        userName: 'John Doe',
      };

      eventBus.once('user:login', handler);
      eventBus.emit('user:login', payload);
      eventBus.emit('user:login', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should allow manual unsubscribe before event is emitted', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.once('user:logout', handler);
      unsubscribe();
      eventBus.emit('user:logout', undefined);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit() - Event emission', () => {
    it('should emit events to subscribed handlers', () => {
      const handler = vi.fn();
      const payload: EventPayload<'settings:changed'> = {
        key: 'theme',
        value: 'dark',
      };

      eventBus.on('settings:changed', handler);
      eventBus.emit('settings:changed', payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should handle errors in handlers without stopping other handlers', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('task:deleted', handler1);
      eventBus.on('task:deleted', handler2);
      eventBus.emit('task:deleted', { taskId: '789' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should not throw error when emitting event with no subscribers', () => {
      expect(() => {
        eventBus.emit('task:updated', { taskId: '123', task: {} });
      }).not.toThrow();
    });
  });

  describe('unsubscribe() - Unsubscription', () => {
    it('should stop receiving events after unsubscribe', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('project:opened', handler);
      eventBus.emit('project:opened', { projectPath: '/path/to/project' });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('project:opened', { projectPath: '/another/path' });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle multiple unsubscribes safely', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('project:closed', handler);
      unsubscribe();
      unsubscribe(); // Should not throw

      eventBus.emit('project:closed', undefined);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = eventBus.on('file:selected', handler1);
      eventBus.on('file:selected', handler2);

      unsubscribe1();
      eventBus.emit('file:selected', { filePath: '/test.ts' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('off() - Remove all handlers for event', () => {
    it('should remove all handlers for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('task:updated', handler1);
      eventBus.on('task:updated', handler2);

      eventBus.off('task:updated');
      eventBus.emit('task:updated', { taskId: '123', task: {} });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clear() - Remove all handlers', () => {
    it('should remove all event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('task:updated', handler1);
      eventBus.on('user:login', handler2);
      eventBus.onAny(handler3);

      eventBus.clear();

      eventBus.emit('task:updated', { taskId: '123', task: {} });
      eventBus.emit('user:login', { userId: '1', userName: 'test' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('onAny() - Wildcard event listener', () => {
    it('should receive all emitted events', () => {
      const handler = vi.fn();

      eventBus.onAny(handler);

      eventBus.emit('task:updated', { taskId: '123', task: {} });
      eventBus.emit('user:login', { userId: '1', userName: 'test' });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support unsubscribe for wildcard listeners', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.onAny(handler);
      eventBus.emit('task:created', { taskId: '123', task: {} });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('task:updated', { taskId: '123', task: {} });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle errors in wildcard handlers', () => {
      const handler = vi.fn(() => {
        throw new Error('Wildcard handler error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.onAny(handler);
      eventBus.emit('task:deleted', { taskId: '789' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Memory leak prevention', () => {
    it('should clean up empty handler sets after unsubscribe', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('task:updated', handler);
      expect(eventBus.listenerCount('task:updated')).toBe(1);

      unsubscribe();
      expect(eventBus.listenerCount('task:updated')).toBe(0);
      expect(eventBus.eventNames()).not.toContain('task:updated');
    });

    it('should clean up after once() handlers are called', () => {
      const handler = vi.fn();

      eventBus.once('user:login', handler);
      expect(eventBus.listenerCount('user:login')).toBe(1);

      eventBus.emit('user:login', { userId: '1', userName: 'test' });
      expect(eventBus.listenerCount('user:login')).toBe(0);
    });

    it('should properly clean up with multiple subscriptions and unsubscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const unsubscribe1 = eventBus.on('task:updated', handler1);
      const unsubscribe2 = eventBus.on('task:updated', handler2);
      eventBus.on('task:updated', handler3);

      expect(eventBus.listenerCount('task:updated')).toBe(3);

      unsubscribe1();
      expect(eventBus.listenerCount('task:updated')).toBe(2);

      unsubscribe2();
      expect(eventBus.listenerCount('task:updated')).toBe(1);
    });
  });

  describe('Utility methods', () => {
    it('listenerCount() should return correct count', () => {
      expect(eventBus.listenerCount('task:updated')).toBe(0);

      eventBus.on('task:updated', vi.fn());
      expect(eventBus.listenerCount('task:updated')).toBe(1);

      eventBus.on('task:updated', vi.fn());
      expect(eventBus.listenerCount('task:updated')).toBe(2);
    });

    it('eventNames() should return list of events with handlers', () => {
      expect(eventBus.eventNames()).toEqual([]);

      eventBus.on('task:updated', vi.fn());
      eventBus.on('user:login', vi.fn());

      const names = eventBus.eventNames();
      expect(names).toContain('task:updated');
      expect(names).toContain('user:login');
      expect(names).toHaveLength(2);
    });

    it('hasListeners() should check if event has handlers', () => {
      expect(eventBus.hasListeners('task:updated')).toBe(false);

      eventBus.on('task:updated', vi.fn());
      expect(eventBus.hasListeners('task:updated')).toBe(true);

      eventBus.off('task:updated');
      expect(eventBus.hasListeners('task:updated')).toBe(false);
    });
  });

  describe('createEventBus() factory', () => {
    it('should create a new EventBus instance', () => {
      const bus = createEventBus();
      expect(bus).toBeInstanceOf(EventBus);
    });

    it('should create independent instances', () => {
      const bus1 = createEventBus();
      const bus2 = createEventBus();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus1.on('task:updated', handler1);
      bus2.on('task:updated', handler2);

      bus1.emit('task:updated', { taskId: '123', task: {} });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Type safety', () => {
    it('should handle different event payload types', () => {
      const taskHandler = vi.fn();
      const userHandler = vi.fn();
      const settingsHandler = vi.fn();

      eventBus.on('task:updated', taskHandler);
      eventBus.on('user:login', userHandler);
      eventBus.on('settings:changed', settingsHandler);

      eventBus.emit('task:updated', { taskId: '123', task: {} });
      eventBus.emit('user:login', { userId: '1', userName: 'test' });
      eventBus.emit('settings:changed', { key: 'theme', value: 'dark' });

      expect(taskHandler).toHaveBeenCalledWith({ taskId: '123', task: {} });
      expect(userHandler).toHaveBeenCalledWith({ userId: '1', userName: 'test' });
      expect(settingsHandler).toHaveBeenCalledWith({ key: 'theme', value: 'dark' });
    });

    it('should handle void payloads', () => {
      const handler = vi.fn();

      eventBus.on('user:logout', handler);
      eventBus.emit('user:logout', undefined);

      expect(handler).toHaveBeenCalledWith(undefined);
    });
  });
});
