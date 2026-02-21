/**
 * JCEFBridge - WebSocket-emulation bridge for IDE ↔ React communication
 * Uses window.__jcef_send__ and window.__jcef_receive__ for bidirectional messaging
 */

import { EventBus, createEventBus } from './EventBus';
import { RPCHandler, createRPCHandler } from './RPC';
import type { RPCCallOptions } from './RPC';
import type { EventHandler, Unsubscribe } from './EventBus';
import type {
  BridgeMessage,
  RPCMethodName,
  RPCParams,
  RPCResult,
  EventName,
  EventPayload,
  AppState,
} from './types';
import {
  isRPCResponse,
  isRPCError,
  isEventMessage,
  isStateUpdate,
  isBridgeReady,
} from './types';

/**
 * Window interface extensions for JCEF bridge functions
 */
declare global {
  interface Window {
    __jcef_send__?: (message: string) => void;
    __jcef_receive__?: (message: string) => void;
  }
}

/**
 * Bridge state
 */
type BridgeState = 'initializing' | 'ready' | 'error';

/**
 * Bridge options
 */
export interface JCEFBridgeOptions {
  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;

  /**
   * Timeout for ready handshake in milliseconds (default: 5000ms = 5s)
   */
  readyTimeout?: number;

  /**
   * Bridge version for protocol versioning
   */
  version?: string;
}

/**
 * JCEFBridge class - Main bridge for IDE ↔ React communication
 *
 * Features:
 * - Bidirectional message passing via window functions
 * - RPC pattern for request/response calls
 * - Event bus for pub/sub messaging
 * - State synchronization support
 * - Ready-state handshake
 * - Type-safe message contracts
 */
export class JCEFBridge {
  private eventBus: EventBus;
  private rpc: RPCHandler;
  private state: BridgeState = 'initializing';
  private readyPromise: Promise<void>;
  private readyResolve?: () => void;
  private readyReject?: (error: Error) => void;
  private options: Required<JCEFBridgeOptions>;

  constructor(options: JCEFBridgeOptions = {}) {
    this.options = {
      debug: options.debug ?? false,
      readyTimeout: options.readyTimeout ?? 5000,
      version: options.version ?? '1.0.0',
    };

    this.eventBus = createEventBus();
    this.rpc = createRPCHandler();

    // Hook RPC request emitter to send via JCEF
    this.rpc.setRequestEmitter((id, method, params) => {
      this.send({
        type: 'rpc_request',
        id,
        method,
        params,
        timestamp: Date.now(),
      });
    });

    // Create ready promise
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    // Initialize bridge
    this.initialize();
  }

  /**
   * Initialize the bridge - set up message handlers and perform handshake
   */
  private initialize(): void {
    // Expose receive function for IDE → React messages
    window.__jcef_receive__ = (message: string) => {
      this.handleIncomingMessage(message);
    };

    // Check if __jcef_send__ is available
    if (typeof window.__jcef_send__ !== 'function') {
      this.log('warn', '__jcef_send__ not available, waiting for IDE...');
    }

    // Send ready handshake
    this.sendReadyHandshake();

    // Set ready timeout
    const timeoutId = setTimeout(() => {
      if (this.state === 'initializing') {
        const error = new Error(
          `Bridge ready handshake timed out after ${this.options.readyTimeout}ms`
        );
        this.state = 'error';
        this.readyReject?.(error);
        this.log('error', 'Ready handshake timeout', error);
      }
    }, this.options.readyTimeout);

    // Clear timeout when ready
    this.readyPromise.then(() => clearTimeout(timeoutId)).catch(() => {
      clearTimeout(timeoutId);
    });
  }

  /**
   * Send ready handshake to IDE
   */
  private sendReadyHandshake(): void {
    // Only send if __jcef_send__ is available
    if (typeof window.__jcef_send__ !== 'function') {
      this.log('warn', '__jcef_send__ not available yet, will retry...');
      // Retry after a short delay
      setTimeout(() => this.sendReadyHandshake(), 100);
      return;
    }

    this.send({
      type: 'bridge:ready',
      source: 'react',
      version: this.options.version,
      timestamp: Date.now(),
    });

    this.log('info', 'Sent ready handshake');
  }

  /**
   * Handle incoming message from IDE
   */
  private handleIncomingMessage(messageStr: string): void {
    try {
      const message = JSON.parse(messageStr) as BridgeMessage;
      this.log('debug', 'Received message:', message);

      // Handle different message types
      if (isRPCResponse(message)) {
        this.rpc.handleResponse(message);
      } else if (isRPCError(message)) {
        this.rpc.handleError(message);
      } else if (isEventMessage(message)) {
        this.eventBus.emit(message.event as EventName, message.payload as never);
      } else if (isStateUpdate(message)) {
        this.eventBus.emit('state:update' as EventName, message.updates as never);
      } else if (isBridgeReady(message)) {
        this.handleReadyHandshake(message);
      } else if (message.type === 'bridge:ping') {
        this.handlePing(message);
      } else {
        this.log('warn', 'Unknown message type:', message.type);
      }
    } catch (error) {
      this.log('error', 'Error parsing incoming message:', error);
      // Don't throw - keep bridge running
    }
  }

  /**
   * Handle ready handshake from IDE
   */
  private handleReadyHandshake(message: { source: string; version: string }): void {
    if (message.source === 'ide') {
      this.state = 'ready';
      this.readyResolve?.();
      this.log('info', `Bridge ready (IDE version: ${message.version})`);
    }
  }

  /**
   * Handle ping message from IDE
   */
  private handlePing(message: { id: string; timestamp: number }): void {
    const latency = Date.now() - message.timestamp;
    this.send({
      type: 'bridge:pong',
      id: message.id,
      latency,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a message to IDE via __jcef_send__
   */
  private send(message: BridgeMessage): void {
    const messageStr = JSON.stringify(message);

    if (typeof window.__jcef_send__ !== 'function') {
      this.log('error', '__jcef_send__ not available, cannot send message:', message);
      throw new Error('__jcef_send__ is not available');
    }

    this.log('debug', 'Sending message:', message);
    window.__jcef_send__(messageStr);
  }

  /**
   * Wait for bridge to be ready
   *
   * @returns Promise that resolves when bridge is ready
   *
   * @example
   * ```ts
   * await bridge.ready();
   * const projectPath = await bridge.call('getProjectPath', undefined);
   * ```
   */
  ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Check if bridge is ready
   *
   * @returns True if bridge is ready
   */
  isReady(): boolean {
    return this.state === 'ready';
  }

  /**
   * Get current bridge state
   *
   * @returns Current state
   */
  getState(): BridgeState {
    return this.state;
  }

  /**
   * Make an RPC call to IDE
   *
   * @param method - RPC method name
   * @param params - Method parameters
   * @param options - Call options (timeout, etc.)
   * @returns Promise that resolves with the result
   *
   * @example
   * ```ts
   * const projectPath = await bridge.call('getProjectPath', undefined);
   * console.log('Project:', projectPath);
   * ```
   */
  async call<M extends RPCMethodName>(
    method: M,
    params: RPCParams<M>,
    options?: RPCCallOptions
  ): Promise<RPCResult<M>> {
    return this.rpc.call(method, params, options);
  }

  /**
   * Subscribe to an event from IDE
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```ts
   * const unsubscribe = bridge.on('task:updated', (payload) => {
   *   console.log('Task updated:', payload.taskId);
   * });
   *
   * // Later:
   * unsubscribe();
   * ```
   */
  on<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    return this.eventBus.on(event, handler);
  }

  /**
   * Subscribe to an event once
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  once<E extends EventName>(event: E, handler: EventHandler<E>): Unsubscribe {
    return this.eventBus.once(event, handler);
  }

  /**
   * Emit an event to IDE
   * Note: Most events flow from IDE → React, but this allows React → IDE events
   *
   * @param event - Event name
   * @param payload - Event payload
   */
  emit<E extends EventName>(event: E, payload: EventPayload<E>): void {
    this.send({
      type: 'event',
      event,
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Send state changes to IDE for synchronization
   *
   * @param changes - Partial state changes
   */
  syncState(changes: Partial<AppState>): void {
    this.send({
      type: 'state:sync',
      changes,
      timestamp: Date.now(),
    });
  }

  /**
   * Report an error to IDE
   *
   * @param error - Error object
   * @param severity - Error severity level
   * @param context - Additional context
   */
  reportError(
    error: Error,
    severity: 'fatal' | 'error' | 'warning' | 'info' = 'error',
    context?: Record<string, unknown>
  ): void {
    this.send({
      type: 'error:report',
      error: {
        message: error.message,
        stack: error.stack,
        severity,
        context,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Get RPC handler (for advanced usage)
   */
  getRPCHandler(): RPCHandler {
    return this.rpc;
  }

  /**
   * Get event bus (for advanced usage)
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Enable or disable debug logging
   *
   * @param enabled - Whether to enable debug logging
   */
  setDebug(enabled: boolean): void {
    this.options.debug = enabled;
  }

  /**
   * Log a message (respects debug setting)
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]): void {
    if (level === 'debug' && !this.options.debug) {
      return;
    }

    const prefix = '[JCEFBridge]';
    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  /**
   * Dispose the bridge (cleanup)
   */
  dispose(): void {
    this.rpc.cancelAll();
    this.eventBus.clear();
    window.__jcef_receive__ = undefined;
    this.log('info', 'Bridge disposed');
  }
}

/**
 * Create a new JCEFBridge instance
 *
 * @param options - Bridge options
 * @returns New bridge instance
 *
 * @example
 * ```ts
 * const bridge = createJCEFBridge({ debug: true });
 * await bridge.ready();
 * ```
 */
export function createJCEFBridge(options?: JCEFBridgeOptions): JCEFBridge {
  return new JCEFBridge(options);
}

/**
 * Default bridge instance (singleton)
 * Use this for most cases unless you need multiple bridge instances
 */
export const bridge = createJCEFBridge({ debug: false });
