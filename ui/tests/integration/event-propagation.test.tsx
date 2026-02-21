/**
 * Integration tests for event propagation from IDE to React
 *
 * Tests the complete flow:
 * 1. IDE emits event via bridge.emitEvent()
 * 2. Event message sent via executeJavaScript to React
 * 3. React receives via window.__jcef_receive__
 * 4. EventBus routes to subscribers
 * 5. syncStore updates state
 * 6. UI reflects new state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { bridge } from '@/bridge/JCEFBridge';
import { useSyncedStore, disposeSyncStore } from '@/state/syncStore';
import type { EventMessage, AppState } from '@/bridge/types';

describe('Event Propagation: IDE → React', () => {
  beforeEach(() => {
    // Mock window.__jcef_send__
    window.__jcef_send__ = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper: Simulate IDE emitting an event
   */
  function simulateIDEEvent<T>(eventName: string, payload: T): void {
    const message: EventMessage<T> = {
      type: 'event',
      timestamp: Date.now(),
      event: eventName,
      payload,
    };

    // Simulate IDE sending event to React
    act(() => {
      if (window.__jcef_receive__) {
        window.__jcef_receive__(JSON.stringify(message));
      }
    });
  }

  /**
   * Helper: Simulate IDE sending state update
   */
  function simulateStateUpdate(updates: Partial<AppState>): void {
    const message = {
      type: 'state:update',
      timestamp: Date.now(),
      updates,
    };

    // Simulate IDE sending state update to React
    act(() => {
      if (window.__jcef_receive__) {
        window.__jcef_receive__(JSON.stringify(message));
      }
    });
  }

  it('should receive generic event from IDE and invoke subscribed handlers', async () => {
    const handler = vi.fn();

    // Subscribe to custom event
    const unsubscribe = bridge.on('task:created', handler);

    // Simulate IDE emitting event
    const payload = { taskId: '123', title: 'New Task' };
    simulateIDEEvent('task:created', payload);

    // Wait for event to be processed
    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(payload);
    });

    unsubscribe();
  });

  it('should update syncStore when IDE emits state:update message', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Initial state should be null
    expect(result.current.selectedFile).toBeNull();

    // Simulate IDE emitting state:update message
    const updates: Partial<AppState> = {
      selectedFile: '/path/to/file.ts',
    };

    simulateStateUpdate(updates);

    // Wait for store to update
    await waitFor(() => {
      expect(result.current.selectedFile).toBe('/path/to/file.ts');
    });
  });

  it('should handle multiple state:update messages and merge state correctly', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Emit first state update
    simulateStateUpdate({ projectPath: '/project' });

    await waitFor(() => {
      expect(result.current.projectPath).toBe('/project');
    });

    // Emit second state update (different field)
    simulateStateUpdate({ selectedFile: '/file.ts' });

    await waitFor(() => {
      expect(result.current.projectPath).toBe('/project');
      expect(result.current.selectedFile).toBe('/file.ts');
    });

    // Emit third state update (overwrite existing field)
    simulateStateUpdate({ projectPath: '/new-project' });

    await waitFor(() => {
      expect(result.current.projectPath).toBe('/new-project');
      expect(result.current.selectedFile).toBe('/file.ts');
    });
  });

  it('should handle task:updated event and update tasks in syncStore', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Set initial state with some tasks
    const initialTasks = [
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' },
    ];

    simulateStateUpdate({ tasks: initialTasks });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(initialTasks);
    });

    // Simulate task:updated event which triggers a state update
    // First, subscribe to the event
    const eventHandler = vi.fn();
    const unsub = bridge.on('task:updated', eventHandler);

    // Simulate IDE emitting task:updated event
    const updatedTask = { id: '1', title: 'Updated Task 1' };
    simulateIDEEvent('task:updated', updatedTask);

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalledWith(updatedTask);
    });

    // Then simulate the corresponding state update that the IDE would emit
    const updatedTasks = [
      { id: '1', title: 'Updated Task 1' },
      { id: '2', title: 'Task 2' },
      { id: '3', title: 'Task 3' },
    ];

    simulateStateUpdate({ tasks: updatedTasks });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(updatedTasks);
      expect(result.current.tasks).toHaveLength(3);
    });

    unsub();
  });

  it('should support multiple concurrent event subscriptions', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    // Subscribe to different events
    const unsub1 = bridge.on('event:one', handler1);
    const unsub2 = bridge.on('event:two', handler2);
    const unsub3 = bridge.on('event:one', handler3); // Same event as handler1

    // Emit event:one
    simulateIDEEvent('event:one', { data: 'test1' });

    await waitFor(() => {
      expect(handler1).toHaveBeenCalledWith({ data: 'test1' });
      expect(handler3).toHaveBeenCalledWith({ data: 'test1' });
      expect(handler2).not.toHaveBeenCalled();
    });

    // Emit event:two
    simulateIDEEvent('event:two', { data: 'test2' });

    await waitFor(() => {
      expect(handler2).toHaveBeenCalledWith({ data: 'test2' });
      expect(handler1).toHaveBeenCalledTimes(1); // Still 1
      expect(handler3).toHaveBeenCalledTimes(1); // Still 1
    });

    unsub1();
    unsub2();
    unsub3();
  });

  it('should handle complex state updates via messages (nested objects)', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Emit state update with complex settings object
    const settingsUpdate: Partial<AppState> = {
      settings: {
        theme: 'dark',
        notifications: {
          enabled: true,
          sound: false,
        },
        filters: {
          status: ['open', 'in-progress'],
        },
      },
    };

    simulateStateUpdate(settingsUpdate);

    await waitFor(() => {
      expect(result.current.settings).toEqual(settingsUpdate.settings);
    });

    // Partial update to settings (should replace entire settings object)
    const partialUpdate: Partial<AppState> = {
      settings: {
        theme: 'light',
      },
    };

    simulateStateUpdate(partialUpdate);

    await waitFor(() => {
      expect(result.current.settings).toEqual({ theme: 'light' });
    });
  });

  it('should handle rapid event emissions without losing events', async () => {
    const handler = vi.fn();
    const unsubscribe = bridge.on('rapid:event', handler);

    // Emit multiple events rapidly
    for (let i = 0; i < 10; i++) {
      simulateIDEEvent('rapid:event', { count: i });
    }

    // Wait for all events to be processed
    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(10);
    }, { timeout: 2000 });

    // Verify all payloads were received
    for (let i = 0; i < 10; i++) {
      expect(handler).toHaveBeenCalledWith({ count: i });
    }

    unsubscribe();
  });

  it('should handle user state updates via messages', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Initial user is null
    expect(result.current.user).toBeNull();

    // IDE emits user:login event
    const user = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
    };

    const eventHandler = vi.fn();
    const unsub1 = bridge.on('user:login', eventHandler);

    simulateIDEEvent('user:login', user);

    await waitFor(() => {
      expect(eventHandler).toHaveBeenCalledWith(user);
    });

    // IDE also sends state update with user info
    const userUpdate: Partial<AppState> = { user };

    simulateStateUpdate(userUpdate);

    await waitFor(() => {
      expect(result.current.user).toEqual(user);
    });

    // IDE emits user:logout event
    const logoutHandler = vi.fn();
    const unsub2 = bridge.on('user:logout', logoutHandler);

    simulateIDEEvent('user:logout', null);

    await waitFor(() => {
      expect(logoutHandler).toHaveBeenCalled();
    });

    // IDE sends state update clearing user
    const logoutUpdate: Partial<AppState> = {
      user: null,
    };

    simulateStateUpdate(logoutUpdate);

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });

    unsub1();
    unsub2();
  });

  it('should unsubscribe from events correctly', async () => {
    const handler = vi.fn();

    // Subscribe and then unsubscribe
    const unsubscribe = bridge.on('test:event', handler);
    unsubscribe();

    // Emit event after unsubscribing
    simulateIDEEvent('test:event', { data: 'test' });

    // Wait a bit to ensure event would have been processed if subscribed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Handler should not have been called
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle event emission before bridge is ready', async () => {
    // This test verifies that events can be emitted even if bridge handshake
    // hasn't completed yet (events are queued or processed when bridge becomes ready)

    const handler = vi.fn();
    bridge.on('early:event', handler);

    // Simulate event before bridge ready
    simulateIDEEvent('early:event', { data: 'early' });

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith({ data: 'early' });
    });
  });
});

/**
 * End-to-End Event Propagation Flow
 *
 * This test suite verifies the complete event flow as described in subtask-9-3:
 * 1. IDE emits 'task:updated' event
 * 2. React receives event via bridge
 * 3. React updates state via syncStore
 * 4. UI reflects new state
 */
describe('E2E Event Flow: task:updated scenario', () => {
  beforeEach(() => {
    window.__jcef_send__ = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper: Simulate IDE emitting an event
   */
  function simulateIDEEvent<T>(eventName: string, payload: T): void {
    const message: EventMessage<T> = {
      type: 'event',
      timestamp: Date.now(),
      event: eventName,
      payload,
    };

    act(() => {
      if (window.__jcef_receive__) {
        window.__jcef_receive__(JSON.stringify(message));
      }
    });
  }

  /**
   * Helper: Simulate IDE sending state update
   */
  function simulateStateUpdate(updates: Partial<AppState>): void {
    const message = {
      type: 'state:update',
      timestamp: Date.now(),
      updates,
    };

    act(() => {
      if (window.__jcef_receive__) {
        window.__jcef_receive__(JSON.stringify(message));
      }
    });
  }

  it('should complete full event flow: IDE emits task:updated → React updates state → UI reflects change', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Step 1: Initialize with some tasks via state update
    const initialTasks = [
      { id: 'task-1', title: 'Original Task', status: 'open' },
    ];

    simulateStateUpdate({ tasks: initialTasks });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(initialTasks);
    });

    // Step 2: IDE emits task:updated event
    const taskUpdateHandler = vi.fn();
    const unsub = bridge.on('task:updated', taskUpdateHandler);

    const updatedTaskData = {
      id: 'task-1',
      title: 'Updated Task',
      status: 'completed',
    };

    simulateIDEEvent('task:updated', updatedTaskData);

    await waitFor(() => {
      expect(taskUpdateHandler).toHaveBeenCalledWith(updatedTaskData);
    });

    // Step 3: IDE sends corresponding state update with new task list
    const updatedTasks = [updatedTaskData];

    simulateStateUpdate({ tasks: updatedTasks });

    // Step 4: React updates state via syncStore
    // Step 5: UI reflects new state (verified by checking store)
    await waitFor(() => {
      expect(result.current.tasks).toEqual(updatedTasks);
      expect(result.current.tasks[0].status).toBe('completed');
      expect(result.current.tasks[0].title).toBe('Updated Task');
    });

    unsub();
  });
});
