import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RPCHandler, RPCTimeoutError, RPCRemoteError } from './RPC';

import type { RPCResponse, RPCError } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh RPCHandler with a no-op emitter that captures the last emitted id. */
function makeRPC() {
  const rpc = new RPCHandler();
  let lastId = '';
  rpc.setRequestEmitter((id) => {
    lastId = id;
  });
  return { rpc, getLastId: () => lastId };
}

function makeResponse(id: string, result: unknown): RPCResponse {
  return { type: 'rpc_response', id, result, timestamp: Date.now() };
}

function makeError(id: string, code: string, message: string): RPCError {
  return { type: 'rpc_error', id, error: { code, message }, timestamp: Date.now() };
}

// ---------------------------------------------------------------------------
// AbortSignal
// ---------------------------------------------------------------------------

describe('AbortSignal support', () => {
  it('rejects immediately when signal is already aborted', async () => {
    const { rpc } = makeRPC();
    const controller = new AbortController();
    controller.abort();

    await expect(
      rpc.call('getProjectPath', undefined, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(rpc.pendingCount()).toBe(0);
  });

  it('does not add to pendingRequests when signal is already aborted', async () => {
    const { rpc } = makeRPC();
    const controller = new AbortController();
    controller.abort();

    void rpc
      .call('getProjectPath', undefined, { signal: controller.signal })
      .catch((_: unknown) => undefined);

    // Flush microtasks
    await Promise.resolve();
    expect(rpc.pendingCount()).toBe(0);
  });

  it('rejects mid-flight when signal is aborted after call starts', async () => {
    const { rpc } = makeRPC();
    const controller = new AbortController();

    const promise = rpc.call('getProjectPath', undefined, { signal: controller.signal });
    expect(rpc.pendingCount()).toBe(1);

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(rpc.pendingCount()).toBe(0);
  });

  it('rejects with DOMException on abort', async () => {
    const { rpc } = makeRPC();
    const controller = new AbortController();

    const promise = rpc.call('getProjectPath', undefined, { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(DOMException);
  });

  it('cancels the timeout when signal is aborted', async () => {
    vi.useFakeTimers();
    try {
      const { rpc } = makeRPC();
      const controller = new AbortController();

      const promise = rpc.call('getProjectPath', undefined, {
        signal: controller.signal,
        timeout: 30_000,
      });

      controller.abort();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });

      // Advancing past timeout should not trigger additional rejections
      await vi.advanceTimersByTimeAsync(31_000);
      expect(rpc.pendingCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

describe('timeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('rejects with RPCTimeoutError after the default 30s timeout', async () => {
    const { rpc } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined);
    expect(rpc.pendingCount()).toBe(1);

    // Attach handler BEFORE advancing timers to avoid unhandled-rejection warnings
    const assertion = expect(promise).rejects.toBeInstanceOf(RPCTimeoutError);
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;

    expect(rpc.pendingCount()).toBe(0);
  });

  it('timeout error message includes method name and duration', async () => {
    const { rpc } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined);
    const a1 = expect(promise).rejects.toThrow('getProjectPath');
    const a2 = expect(promise).rejects.toThrow('30000ms');
    await vi.advanceTimersByTimeAsync(30_000);
    await a1;
    await a2;
  });

  it('respects a custom timeout option', async () => {
    const { rpc } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined, { timeout: 5_000 });
    const assertion = expect(promise).rejects.toBeInstanceOf(RPCTimeoutError);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(rpc.pendingCount()).toBe(1); // still pending

    await vi.advanceTimersByTimeAsync(1);
    await assertion;

    expect(rpc.pendingCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// handleResponse
// ---------------------------------------------------------------------------

describe('handleResponse', () => {
  it('resolves the matching pending request with the result', async () => {
    const { rpc, getLastId } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined);
    rpc.handleResponse(makeResponse(getLastId(), '/path/to/project'));

    await expect(promise).resolves.toBe('/path/to/project');
    expect(rpc.pendingCount()).toBe(0);
  });

  it('ignores a response for an unknown request id', () => {
    const { rpc } = makeRPC();
    // Should not throw
    expect(() => rpc.handleResponse(makeResponse('unknown-id', null))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// handleError
// ---------------------------------------------------------------------------

describe('handleError', () => {
  it('rejects the matching pending request with RPCRemoteError', async () => {
    const { rpc, getLastId } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined);
    rpc.handleError(makeError(getLastId(), 'NOT_FOUND', 'Card not found'));

    await expect(promise).rejects.toBeInstanceOf(RPCRemoteError);
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Card not found' });
    expect(rpc.pendingCount()).toBe(0);
  });

  it('ignores an error for an unknown request id', () => {
    const { rpc } = makeRPC();
    expect(() => rpc.handleError(makeError('unknown-id', 'ERR', 'oops'))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// cancel / cancelAll
// ---------------------------------------------------------------------------

describe('cancel', () => {
  it('cancels a pending request by id and resolves pendingCount', async () => {
    const { rpc, getLastId } = makeRPC();

    const promise = rpc.call('getProjectPath', undefined);
    expect(rpc.pendingCount()).toBe(1);

    const cancelled = rpc.cancel(getLastId());
    expect(cancelled).toBe(true);
    expect(rpc.pendingCount()).toBe(0);

    await expect(promise).rejects.toThrow('cancelled');
  });

  it('returns false for a non-existent request id', () => {
    const { rpc } = makeRPC();
    expect(rpc.cancel('no-such-id')).toBe(false);
  });

  it('cancelAll cancels all pending requests', async () => {
    // setup.ts stubs crypto.randomUUID to always return 'test-uuid'; override
    // with a counter so two concurrent calls get distinct IDs in the Map.
    let n = 0;
    vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++n}` });

    const { rpc } = makeRPC();

    const p1 = rpc.call('getProjectPath', undefined);
    const p2 = rpc.call('getSettings', undefined);
    expect(rpc.pendingCount()).toBe(2);

    const count = rpc.cancelAll();
    expect(count).toBe(2);
    expect(rpc.pendingCount()).toBe(0);

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();

    // Restore the shared mock from setup.ts
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  });
});
