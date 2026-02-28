/**
 * EventBus tests
 * Verifies event emission, subscription, unsubscription, and memory leak prevention
 *
 * Only events defined in Kotlin EventNames / TypeScript EventTypes are used:
 *   - 'theme:changed'  (IdeTheme payload)
 *   - 'state:update'   (Partial<AppState> payload)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { EventBus, createEventBus } from '../../src/bridge/EventBus';

import type { EventPayload, IdeTheme } from '../../src/bridge/types';

const MOCK_THEME: IdeTheme = {
  isDark: false,
  background: '#ffffff',
  foreground: '#000000',
  card: '#ffffff',
  cardForeground: '#000000',
  popover: '#ffffff',
  popoverForeground: '#000000',
  primary: '#0066cc',
  primaryForeground: '#ffffff',
  secondary: '#f0f0f0',
  secondaryForeground: '#000000',
  muted: '#f0f0f0',
  mutedForeground: '#666666',
  accent: '#e8f4ff',
  accentForeground: '#000000',
  border: '#e0e0e0',
  input: '#e0e0e0',
  inputForeground: '#000000',
  ring: '#0066cc',
  destructive: '#ff0000',
  destructiveForeground: '#ffffff',
  radius: '4px',
  fontSize: '14px',
  fontSizeSm: '12px',
  fontSizeXs: '10px',
  fontFamily: 'sans-serif',
};

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() - Event subscription', () => {
    it('should subscribe to events and receive emitted payloads', () => {
      const handler = vi.fn();
      const payload: EventPayload<'theme:changed'> = MOCK_THEME;

      eventBus.on('theme:changed', handler);
      eventBus.emit('theme:changed', payload);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('should support multiple subscribers to the same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('theme:changed', handler1);
      eventBus.on('theme:changed', handler2);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(MOCK_THEME);
      expect(handler2).toHaveBeenCalledWith(MOCK_THEME);
    });

    it('should return an unsubscribe function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('theme:changed', handler);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should not call handler for different events', () => {
      const handler = vi.fn();

      eventBus.on('theme:changed', handler);
      eventBus.emit('state:update', { projectPath: '/test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once() - One-time subscription', () => {
    it('should call handler only once', () => {
      const handler = vi.fn();

      eventBus.once('theme:changed', handler);
      eventBus.emit('theme:changed', MOCK_THEME);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(MOCK_THEME);
    });

    it('should allow manual unsubscribe before event is emitted', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.once('theme:changed', handler);
      unsubscribe();
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit() - Event emission', () => {
    it('should emit events to subscribed handlers', () => {
      const handler = vi.fn();

      eventBus.on('theme:changed', handler);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledWith(MOCK_THEME);
    });

    it('should handle errors in handlers without stopping other handlers', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('theme:changed', handler1);
      eventBus.on('theme:changed', handler2);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should not throw error when emitting event with no subscribers', () => {
      expect(() => {
        eventBus.emit('theme:changed', MOCK_THEME);
      }).not.toThrow();
    });
  });

  describe('unsubscribe() - Unsubscription', () => {
    it('should stop receiving events after unsubscribe', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('theme:changed', handler);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle multiple unsubscribes safely', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('theme:changed', handler);
      unsubscribe();
      unsubscribe(); // Should not throw

      eventBus.emit('theme:changed', MOCK_THEME);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only unsubscribe the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = eventBus.on('theme:changed', handler1);
      eventBus.on('theme:changed', handler2);

      unsubscribe1();
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('off() - Remove all handlers for event', () => {
    it('should remove all handlers for a specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('theme:changed', handler1);
      eventBus.on('theme:changed', handler2);

      eventBus.off('theme:changed');
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clear() - Remove all handlers', () => {
    it('should remove all event handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('theme:changed', handler1);
      eventBus.on('state:update', handler2);
      eventBus.onAny(handler3);

      eventBus.clear();

      eventBus.emit('theme:changed', MOCK_THEME);
      eventBus.emit('state:update', { projectPath: '/test' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });
  });

  describe('onAny() - Wildcard event listener', () => {
    it('should receive all emitted events', () => {
      const handler = vi.fn();

      eventBus.onAny(handler);

      eventBus.emit('theme:changed', MOCK_THEME);
      eventBus.emit('state:update', { projectPath: '/test' });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support unsubscribe for wildcard listeners', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.onAny(handler);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      eventBus.emit('state:update', { projectPath: '/test' });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle errors in wildcard handlers', () => {
      const handler = vi.fn(() => {
        throw new Error('Wildcard handler error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.onAny(handler);
      eventBus.emit('theme:changed', MOCK_THEME);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Memory leak prevention', () => {
    it('should clean up empty handler sets after unsubscribe', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.on('theme:changed', handler);
      expect(eventBus.listenerCount('theme:changed')).toBe(1);

      unsubscribe();
      expect(eventBus.listenerCount('theme:changed')).toBe(0);
      expect(eventBus.eventNames()).not.toContain('theme:changed');
    });

    it('should clean up after once() handlers are called', () => {
      const handler = vi.fn();

      eventBus.once('theme:changed', handler);
      expect(eventBus.listenerCount('theme:changed')).toBe(1);

      eventBus.emit('theme:changed', MOCK_THEME);
      expect(eventBus.listenerCount('theme:changed')).toBe(0);
    });

    it('should properly clean up with multiple subscriptions and unsubscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const unsubscribe1 = eventBus.on('theme:changed', handler1);
      const unsubscribe2 = eventBus.on('theme:changed', handler2);
      eventBus.on('theme:changed', handler3);

      expect(eventBus.listenerCount('theme:changed')).toBe(3);

      unsubscribe1();
      expect(eventBus.listenerCount('theme:changed')).toBe(2);

      unsubscribe2();
      expect(eventBus.listenerCount('theme:changed')).toBe(1);
    });
  });

  describe('Utility methods', () => {
    it('listenerCount() should return correct count', () => {
      expect(eventBus.listenerCount('theme:changed')).toBe(0);

      eventBus.on('theme:changed', vi.fn());
      expect(eventBus.listenerCount('theme:changed')).toBe(1);

      eventBus.on('theme:changed', vi.fn());
      expect(eventBus.listenerCount('theme:changed')).toBe(2);
    });

    it('eventNames() should return list of events with handlers', () => {
      expect(eventBus.eventNames()).toEqual([]);

      eventBus.on('theme:changed', vi.fn());
      eventBus.on('state:update', vi.fn());

      const names = eventBus.eventNames();
      expect(names).toContain('theme:changed');
      expect(names).toContain('state:update');
      expect(names).toHaveLength(2);
    });

    it('hasListeners() should check if event has handlers', () => {
      expect(eventBus.hasListeners('theme:changed')).toBe(false);

      eventBus.on('theme:changed', vi.fn());
      expect(eventBus.hasListeners('theme:changed')).toBe(true);

      eventBus.off('theme:changed');
      expect(eventBus.hasListeners('theme:changed')).toBe(false);
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

      bus1.on('theme:changed', handler1);
      bus2.on('theme:changed', handler2);

      bus1.emit('theme:changed', MOCK_THEME);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Type safety', () => {
    it('should handle different event payload types', () => {
      const themeHandler = vi.fn();
      const stateHandler = vi.fn();

      eventBus.on('theme:changed', themeHandler);
      eventBus.on('state:update', stateHandler);

      eventBus.emit('theme:changed', MOCK_THEME);
      eventBus.emit('state:update', { projectPath: '/my/project' });

      expect(themeHandler).toHaveBeenCalledWith(MOCK_THEME);
      expect(stateHandler).toHaveBeenCalledWith({ projectPath: '/my/project' });
    });
  });
});
