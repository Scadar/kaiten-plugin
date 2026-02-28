/**
 * RPC (Remote Procedure Call) handler with UUID-based request/response matching
 * Provides type-safe method calls from React to IDE with timeout handling
 */

import type { RPCMethodName, RPCParams, RPCResult, RPCResponse, RPCError } from './types';

/**
 * RPC call options
 */
export interface RPCCallOptions {
  /**
   * Timeout in milliseconds (default: 30000ms = 30s)
   */
  timeout?: number;
}

/**
 * RPC timeout error
 */
export class RPCTimeoutError extends Error {
  constructor(method: string, timeout: number) {
    super(`RPC call to "${method}" timed out after ${timeout}ms`);
    this.name = 'RPCTimeoutError';
  }
}

/**
 * RPC remote error (error from IDE side)
 */
export class RPCRemoteError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'RPCRemoteError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Pending RPC request tracking
 */
interface PendingRequest<T = unknown> {
  method: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * RPC handler class for managing remote procedure calls
 *
 * Features:
 * - UUID-based request/response matching
 * - Configurable timeout per call
 * - Concurrent RPC call support
 * - Type-safe method calls
 * - Proper error handling and cleanup
 */
export class RPCHandler {
  private pendingRequests = new Map<string, PendingRequest>();
  private defaultTimeout = 30000; // 30 seconds

  /**
   * Set default timeout for all RPC calls
   *
   * @param timeout - Timeout in milliseconds
   */
  setDefaultTimeout(timeout: number): void {
    if (timeout <= 0) {
      throw new Error('Timeout must be greater than 0');
    }
    this.defaultTimeout = timeout;
  }

  /**
   * Get default timeout
   *
   * @returns Current default timeout in milliseconds
   */
  getDefaultTimeout(): number {
    return this.defaultTimeout;
  }

  /**
   * Create a new RPC request with UUID and return a promise
   *
   * @param method - RPC method name
   * @param params - Method parameters
   * @param options - Call options (timeout, etc.)
   * @returns Promise that resolves with the RPC result
   *
   * @example
   * ```ts
   * const result = await rpc.call('getProjectPath', undefined);
   * console.log('Project path:', result);
   * ```
   */
  call<M extends RPCMethodName>(
    method: M,
    params: RPCParams<M>,
    options: RPCCallOptions = {},
  ): Promise<RPCResult<M>> {
    const id = crypto.randomUUID();
    const timeout = options.timeout ?? this.defaultTimeout;

    return new Promise<RPCResult<M>>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new RPCTimeoutError(method, timeout));
      }, timeout);

      // Store pending request
      this.pendingRequests.set(id, {
        method,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeoutId,
      });

      // Emit request (will be sent by JCEFBridge)
      this.emitRequest(id, method, params);
    });
  }

  /**
   * Handle RPC response from IDE
   *
   * @param response - RPC response message
   */
  handleResponse(response: RPCResponse): void {
    const pending = this.pendingRequests.get(response.id);

    if (!pending) {
      // Response for unknown or already-completed request - ignore
      console.warn(`Received response for unknown RPC request: ${response.id}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeoutId);

    // Remove from pending
    this.pendingRequests.delete(response.id);

    // Resolve promise
    pending.resolve(response.result);
  }

  /**
   * Handle RPC error from IDE
   *
   * @param error - RPC error message
   */
  handleError(error: RPCError): void {
    const pending = this.pendingRequests.get(error.id);

    if (!pending) {
      // Error for unknown or already-completed request - ignore
      console.warn(`Received error for unknown RPC request: ${error.id}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeoutId);

    // Remove from pending
    this.pendingRequests.delete(error.id);

    // Reject promise with remote error
    pending.reject(new RPCRemoteError(error.error.code, error.error.message, error.error.details));
  }

  /**
   * Cancel a pending RPC request by ID
   *
   * @param id - Request ID to cancel
   * @returns True if request was cancelled, false if not found
   */
  cancel(id: string): boolean {
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      return false;
    }

    // Clear timeout
    clearTimeout(pending.timeoutId);

    // Remove from pending
    this.pendingRequests.delete(id);

    // Reject with cancellation error
    pending.reject(new Error(`RPC call to "${pending.method}" was cancelled`));

    return true;
  }

  /**
   * Cancel all pending RPC requests
   *
   * @returns Number of requests cancelled
   */
  cancelAll(): number {
    const count = this.pendingRequests.size;

    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(`RPC call to "${pending.method}" was cancelled`));
    }

    this.pendingRequests.clear();

    return count;
  }

  /**
   * Get count of pending RPC requests
   *
   * @returns Number of pending requests
   */
  pendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get list of pending RPC request IDs
   *
   * @returns Array of request IDs
   */
  pendingRequestIds(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Get details of a pending request
   *
   * @param id - Request ID
   * @returns Request details or undefined if not found
   */
  getPendingRequest(id: string): { method: string } | undefined {
    const pending = this.pendingRequests.get(id);
    return pending ? { method: pending.method } : undefined;
  }

  /**
   * Emit RPC request (to be overridden or hooked by JCEFBridge)
   * This is called internally to send the request to the IDE
   *
   * @param id - Request UUID
   * @param method - Method name
   * @param params - Method parameters
   */
  protected emitRequest(id: string, method: string, params: unknown): void {
    // This will be hooked by JCEFBridge to actually send the request
    // Default implementation does nothing (useful for testing)
    // eslint-disable-next-line no-console
    console.debug(`RPC request: ${method} (${id})`, params);
  }

  /**
   * Set custom request emitter (used by JCEFBridge)
   *
   * @param emitter - Function to emit RPC requests
   */
  setRequestEmitter(emitter: (id: string, method: string, params: unknown) => void): void {
    this.emitRequest = emitter;
  }
}

/**
 * Create a new RPC handler instance
 *
 * @example
 * ```ts
 * const rpc = createRPCHandler();
 * rpc.setDefaultTimeout(10000); // 10 seconds
 * ```
 */
export function createRPCHandler(): RPCHandler {
  return new RPCHandler();
}
