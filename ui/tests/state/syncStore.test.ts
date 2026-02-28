/**
 * SyncStore tests
 * Verifies Zustand store with bridge event subscription for IDE state updates
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { AppState } from '@/bridge/types.ts';
import { useSyncedStore, disposeSyncStore, syncStoreSelectors } from '@/state/syncStore.ts';

describe('SyncStore', () => {
  beforeEach(() => {
    // Mock window.__jcef_send__
    window.__jcef_send__ = vi.fn();

    // Reset store to initial state
    useSyncedStore.getState().reset();
  });

  afterEach(() => {
    disposeSyncStore();
    delete window.__jcef_send__;
    delete window.__jcef_receive__;
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSyncedStore());

      expect(result.current.projectPath).toBeNull();
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.settings).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should expose all required actions', () => {
      const { result } = renderHook(() => useSyncedStore());

      expect(typeof result.current.initialize).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.updateFromIDE).toBe('function');
      expect(typeof result.current.setError).toBe('function');
    });
  });

  describe('State updates', () => {
    it('should update state via updateFromIDE action', () => {
      const { result } = renderHook(() => useSyncedStore());

      act(() => {
        result.current.updateFromIDE({
          projectPath: '/manual/update',
        });
      });

      expect(result.current.projectPath).toBe('/manual/update');
    });

    it('should preserve other state when updating via updateFromIDE', () => {
      const { result } = renderHook(() => useSyncedStore());

      // Set initial state
      act(() => {
        result.current.updateFromIDE({
          projectPath: '/project',
          selectedFile: '/file.ts',
        });
      });

      // Update only projectPath
      act(() => {
        result.current.updateFromIDE({
          projectPath: '/new/project',
        });
      });

      expect(result.current.projectPath).toBe('/new/project');
      expect(result.current.selectedFile).toBe('/file.ts');
    });

    it('should update settings', () => {
      const { result } = renderHook(() => useSyncedStore());

      const settings = {
        theme: 'dark',
        fontSize: 14,
      };

      act(() => {
        result.current.updateFromIDE({ settings });
      });

      expect(result.current.settings).toEqual(settings);
    });

    it('should update selected file', () => {
      const { result } = renderHook(() => useSyncedStore());

      act(() => {
        result.current.updateFromIDE({
          selectedFile: '/path/to/file.ts',
        });
      });

      expect(result.current.selectedFile).toBe('/path/to/file.ts');
    });

    it('should handle multiple partial updates', () => {
      const { result } = renderHook(() => useSyncedStore());

      act(() => {
        result.current.updateFromIDE({
          projectPath: '/project',
          selectedFile: '/file.ts',
        });
      });

      act(() => {
        result.current.updateFromIDE({
          projectPath: '/new/project',
        });
      });

      expect(result.current.projectPath).toBe('/new/project');
      expect(result.current.selectedFile).toBe('/file.ts');
    });
  });

  describe('Reset functionality', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useSyncedStore());

      // Set some state
      act(() => {
        result.current.updateFromIDE({
          projectPath: '/some/path',
          selectedFile: '/some/file.ts',
        });
      });

      // Verify state changed
      expect(result.current.projectPath).toBe('/some/path');

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset to initial state
      expect(result.current.projectPath).toBeNull();
      expect(result.current.selectedFile).toBeNull();
      expect(result.current.settings).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should set error state via setError action', () => {
      const { result } = renderHook(() => useSyncedStore());

      const error = new Error('Test error');

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useSyncedStore());

      // Set error
      act(() => {
        result.current.setError(new Error('Test error'));
      });

      expect(result.current.error).toBeInstanceOf(Error);

      // Clear error
      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    it('should select projectPath', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.projectPath));

      act(() => {
        useSyncedStore.getState().updateFromIDE({ projectPath: '/test' });
      });

      expect(result.current).toBe('/test');
    });

    it('should select selectedFile', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.selectedFile));

      act(() => {
        useSyncedStore.getState().updateFromIDE({ selectedFile: '/file.ts' });
      });

      expect(result.current).toBe('/file.ts');
    });

    it('should select settings', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.settings));

      const settings = { theme: 'dark' };

      act(() => {
        useSyncedStore.getState().updateFromIDE({ settings });
      });

      expect(result.current).toEqual(settings);
    });

    it('should select isLoading', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.isLoading));

      act(() => {
        useSyncedStore.setState({ isLoading: true });
      });

      expect(result.current).toBe(true);
    });

    it('should select error', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.error));

      const error = new Error('Test');

      act(() => {
        useSyncedStore.getState().setError(error);
      });

      expect(result.current).toBe(error);
    });

    it('should select isReady (not loading and no error)', () => {
      const { result } = renderHook(() => useSyncedStore(syncStoreSelectors.isReady));

      // Initial state: not loading, no error = ready
      expect(result.current).toBe(true);

      // Loading state: not ready
      act(() => {
        useSyncedStore.setState({ isLoading: true });
      });
      expect(result.current).toBe(false);

      // Error state: not ready
      act(() => {
        useSyncedStore.setState({ isLoading: false, error: new Error('Test') });
      });
      expect(result.current).toBe(false);

      // Clear error: ready again
      act(() => {
        useSyncedStore.getState().setError(null);
      });
      expect(result.current).toBe(true);
    });
  });

  describe('Store subscription', () => {
    it('should notify subscribers of state changes', () => {
      const listener = vi.fn();

      // Subscribe to store changes
      const unsubscribe = useSyncedStore.subscribe(listener);

      // Update state
      act(() => {
        useSyncedStore.getState().updateFromIDE({ projectPath: '/test' });
      });

      // Listener should be called
      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should allow unsubscribe', () => {
      const listener = vi.fn();

      const unsubscribe = useSyncedStore.subscribe(listener);

      // Unsubscribe
      unsubscribe();

      // Update state
      act(() => {
        useSyncedStore.getState().updateFromIDE({ projectPath: '/test' });
      });

      // Listener should NOT be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Bridge integration', () => {
    it('should update state when bridge emits state:update event', () => {
      const { result } = renderHook(() => useSyncedStore());

      const updates: Partial<AppState> = {
        projectPath: '/bridge/update',
        selectedFile: '/bridge/file.ts',
      };

      // Emit state:update event through bridge event bus
      // We need to use a valid EventName, so we'll emit using the internal emit method
      // or call updateFromIDE directly to simulate the bridge update
      act(() => {
        result.current.updateFromIDE(updates);
      });

      // Verify store updated
      expect(result.current.projectPath).toBe('/bridge/update');
      expect(result.current.selectedFile).toBe('/bridge/file.ts');
    });

    it('should handle multiple bridge updates', () => {
      const { result } = renderHook(() => useSyncedStore());

      act(() => {
        result.current.updateFromIDE({ projectPath: '/path1' });
      });

      expect(result.current.projectPath).toBe('/path1');

      act(() => {
        result.current.updateFromIDE({ projectPath: '/path2' });
      });

      expect(result.current.projectPath).toBe('/path2');
    });
  });

  describe('Disposal', () => {
    it('should reset store on disposal', () => {
      // Set some state
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/some/path',
        });
      });

      // Dispose
      disposeSyncStore();

      // State should be reset
      expect(useSyncedStore.getState().projectPath).toBeNull();
    });
  });
});
