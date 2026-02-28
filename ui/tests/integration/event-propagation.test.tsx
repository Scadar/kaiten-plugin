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
 *
 * Only events defined in Kotlin EventNames / TypeScript EventTypes are used:
 *   - 'theme:changed'  (IdeTheme payload)
 *   - 'state:update'   arrives as StateUpdateMessage, handled separately
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { bridge } from '@/bridge/JCEFBridge';
import type { EventMessage, AppState, IdeTheme } from '@/bridge/types';
import { useSyncedStore } from '@/state/syncStore';

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

/**
 * Helper: Simulate IDE emitting a theme:changed event
 */
function simulateThemeChanged(theme: IdeTheme): void {
  const message: EventMessage<IdeTheme> = {
    type: 'event',
    timestamp: Date.now(),
    event: 'theme:changed',
    payload: theme,
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

describe('Event Propagation: IDE → React', () => {
  beforeEach(() => {
    // Mock window.__jcef_send__
    window.__jcef_send__ = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should receive theme:changed event from IDE and invoke subscribed handlers', async () => {
    const handler = vi.fn();

    const unsubscribe = bridge.on('theme:changed', handler);

    simulateThemeChanged(MOCK_THEME);

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(MOCK_THEME);
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

  it('should support multiple concurrent event subscriptions for different event types', async () => {
    const themeHandler1 = vi.fn();
    const themeHandler3 = vi.fn();
    const stateHandler2 = vi.fn();

    // Two handlers on theme:changed, one on state:update
    const unsub1 = bridge.on('theme:changed', themeHandler1);
    const unsub2 = bridge.on('state:update', stateHandler2);
    const unsub3 = bridge.on('theme:changed', themeHandler3);

    // Emit theme:changed — only theme handlers should fire
    simulateThemeChanged(MOCK_THEME);

    await waitFor(() => {
      expect(themeHandler1).toHaveBeenCalledWith(MOCK_THEME);
      expect(themeHandler3).toHaveBeenCalledWith(MOCK_THEME);
      expect(stateHandler2).not.toHaveBeenCalled();
    });

    // Emit state:update — only state handler should fire
    simulateStateUpdate({ projectPath: '/test2' });

    await waitFor(() => {
      expect(stateHandler2).toHaveBeenCalledWith({ projectPath: '/test2' });
      expect(themeHandler1).toHaveBeenCalledTimes(1); // Still 1
      expect(themeHandler3).toHaveBeenCalledTimes(1); // Still 1
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

  it('should handle rapid theme:changed emissions without losing events', async () => {
    const handler = vi.fn();
    const unsubscribe = bridge.on('theme:changed', handler);

    // Emit multiple theme events rapidly with varying isDark
    for (let i = 0; i < 10; i++) {
      simulateThemeChanged({ ...MOCK_THEME, isDark: i % 2 === 0 });
    }

    // Wait for all events to be processed
    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(10);
    }, { timeout: 2000 });

    // Verify all payloads were received
    for (let i = 0; i < 10; i++) {
      expect(handler).toHaveBeenCalledWith({ ...MOCK_THEME, isDark: i % 2 === 0 });
    }

    unsubscribe();
  });

  it('should unsubscribe from events correctly', async () => {
    const handler = vi.fn();

    // Subscribe and then unsubscribe
    const unsubscribe = bridge.on('theme:changed', handler);
    unsubscribe();

    // Emit event after unsubscribing
    simulateThemeChanged(MOCK_THEME);

    // Wait a bit to ensure event would have been processed if subscribed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Handler should not have been called
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle event emission before bridge is ready', async () => {
    // This test verifies that events can be emitted even if bridge handshake
    // hasn't completed yet (events are queued or processed when bridge becomes ready)

    const handler = vi.fn();
    bridge.on('theme:changed', handler);

    // Simulate event before bridge ready
    simulateThemeChanged(MOCK_THEME);

    await waitFor(() => {
      expect(handler).toHaveBeenCalledWith(MOCK_THEME);
    });
  });
});

/**
 * End-to-End Event Propagation Flow
 *
 * This test suite verifies the complete event flow:
 * 1. IDE emits 'theme:changed' event
 * 2. React receives event via bridge
 * 3. React can update state alongside via syncStore
 * 4. UI reflects new state
 */
describe('E2E Event Flow: theme:changed scenario', () => {
  beforeEach(() => {
    window.__jcef_send__ = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full event flow: IDE emits theme:changed → React handler invoked → state reflects change', async () => {
    const { result } = renderHook(() => useSyncedStore());

    // Step 1: Initialize with some settings via state update
    const initialSettings = { theme: 'light', fontSize: 14 };

    simulateStateUpdate({ settings: initialSettings });

    await waitFor(() => {
      expect(result.current.settings).toEqual(initialSettings);
    });

    // Step 2: IDE emits theme:changed event
    const themeChangeHandler = vi.fn();
    const unsub = bridge.on('theme:changed', themeChangeHandler);

    simulateThemeChanged(MOCK_THEME);

    await waitFor(() => {
      expect(themeChangeHandler).toHaveBeenCalledWith(MOCK_THEME);
    });

    // Step 3: IDE sends corresponding state update reflecting the new theme
    const updatedSettings = { theme: 'dark', fontSize: 14 };

    simulateStateUpdate({ settings: updatedSettings });

    // Step 4: React updates state via syncStore
    // Step 5: UI reflects new state (verified by checking store)
    await waitFor(() => {
      expect(result.current.settings).toEqual(updatedSettings);
      expect(result.current.settings.theme).toBe('dark');
    });

    unsub();
  });
});
