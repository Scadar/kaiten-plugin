/**
 * EventBus for pub/sub messaging pattern
 * Provides type-safe event emission and subscription
 */

import type { EventName, EventPayload } from './types';

/**
 * Event handler function type
 */
export type EventHandler<E extends EventName = EventName> = (
  payload: EventPayload<E>
) => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Internal handler storage type
 */
interface HandlerEntry {
  handler: EventHandler;
  once: boolean;
}

/**
 * EventBus class for managing event subscriptions and emissions
 *
 * Features:
 * - Type-safe event names and payloads
 * - Support for one-time event handlers
 * - Memory leak prevention through proper cleanup
 * - Wildcard event listening
 */
export class EventBus {
  private handlers: Map<string, Set<HandlerEntry>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();

  /**
   * Subscribe to an event
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @returns Unsubscribe function to remove the handler
   *
   * @example
   * ```ts
   * const unsubscribe = eventBus.on('task:updated', (payload) => {
   *   console.log('Task updated:', payload.taskId);
   * });
   *
   * // Later, when done:
   * unsubscribe();
   * ```
   */
  on<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    return this.addEntry(event, { handler: handler as EventHandler, once: false });
  }

  /**
   * Subscribe to an event once
   * Handler will be automatically removed after first invocation
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call when event is emitted
   * @returns Unsubscribe function to remove the handler (if needed before it fires)
   *
   * @example
   * ```ts
   * eventBus.once('user:login', (payload) => {
   *   console.log('User logged in:', payload.userId);
   * });
   * ```
   */
  once<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    return this.addEntry(event, { handler: handler as EventHandler, once: true });
  }

  private addEntry(event: EventName, entry: HandlerEntry): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(entry);
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(entry);
        if (handlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event with a payload
   * Calls all registered handlers for the event
   *
   * @param event - Event name to emit
   * @param payload - Event payload
   *
   * @example
   * ```ts
   * eventBus.emit('task:updated', {
   *   taskId: '123',
   *   task: { ... }
   * });
   * ```
   */
  emit<E extends EventName>(event: E, payload: EventPayload<E>): void {
    const handlers = this.handlers.get(event);

    if (handlers) {
      // Convert to array to avoid issues if handlers modify the set during iteration
      const entries = Array.from(handlers);

      for (const entry of entries) {
        try {
          entry.handler(payload);

          // Remove one-time handlers after execution
          if (entry.once) {
            handlers.delete(entry);
          }
        } catch (error) {
          // Log error but don't stop other handlers from executing
          console.error(`Error in event handler for "${event}":`, error);
        }
      }

      // Clean up empty sets
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }

    // Emit to wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in wildcard event handler for "${event}":`, error);
      }
    }
  }

  /**
   * Remove all handlers for a specific event
   *
   * @param event - Event name to clear handlers for
   *
   * @example
   * ```ts
   * eventBus.off('task:updated');
   * ```
   */
  off(event: EventName): void {
    this.handlers.delete(event);
  }

  /**
   * Remove all event handlers
   * Useful for cleanup when destroying the event bus
   *
   * @example
   * ```ts
   * eventBus.clear();
   * ```
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }

  /**
   * Subscribe to all events (wildcard listener)
   *
   * @param handler - Handler function to call for any event
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = eventBus.onAny((payload) => {
   *   console.log('Event received:', payload);
   * });
   * ```
   */
  onAny(handler: EventHandler): Unsubscribe {
    this.wildcardHandlers.add(handler);

    return () => {
      this.wildcardHandlers.delete(handler);
    };
  }

  /**
   * Get count of handlers for a specific event
   * Useful for debugging and testing
   *
   * @param event - Event name to count handlers for
   * @returns Number of handlers registered for the event
   */
  listenerCount(event: EventName): number {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get list of all event names that have handlers
   * Useful for debugging
   *
   * @returns Array of event names
   */
  eventNames(): EventName[] {
    return Array.from(this.handlers.keys()) as EventName[];
  }

  /**
   * Check if there are any handlers registered for an event
   *
   * @param event - Event name to check
   * @returns True if there are handlers registered
   */
  hasListeners(event: EventName): boolean {
    return this.listenerCount(event) > 0;
  }
}

/**
 * Create a new EventBus instance
 *
 * @example
 * ```ts
 * const eventBus = createEventBus();
 * ```
 */
export function createEventBus(): EventBus {
  return new EventBus();
}
