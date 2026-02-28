/**
 * Integration tests for bidirectional state synchronization
 *
 * These tests verify the integration of syncStore, syncMiddleware, and bridge
 * for state synchronization between IDE and React.
 *
 * NOTE: Full end-to-end testing with actual bridge communication should be done manually
 * using the StateSyncVerification component in the IDE environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSyncedState, useSyncedField, useSyncedFields } from '@/hooks/useSyncedState';
import { useSyncedStore, disposeSyncStore } from '@/state/syncStore';
import { flushPendingChanges, clearPendingChanges } from '@/state/syncMiddleware';
import { bridge } from '@/bridge/JCEFBridge';
import type { AppState } from '@/bridge/types';

describe('Bidirectional State Synchronization Integration', () => {
  beforeEach(() => {
    // Mock window functions for bridge communication
    window.__jcef_send__ = vi.fn();
    window.__jcef_receive__ = vi.fn();

    // Reset store before each test
    disposeSyncStore();
    clearPendingChanges();
  });

  afterEach(() => {
    clearPendingChanges();
    delete window.__jcef_send__;
    delete window.__jcef_receive__;
    vi.restoreAllMocks();
  });

  describe('React State Management', () => {
    it('should allow updating state via useSyncedState hook', () => {
      const { result } = renderHook(() => useSyncedState());

      // Update single field
      act(() => {
        result.current.updateField('selectedFile', '/test/file.txt');
      });

      expect(result.current.state.selectedFile).toBe('/test/file.txt');
    });

    it('should allow updating multiple fields at once', () => {
      const { result } = renderHook(() => useSyncedState());

      // Update multiple fields
      act(() => {
        result.current.updateFields({
          selectedFile: '/file.txt',
          settings: { theme: 'dark' },
        });
      });

      expect(result.current.state.selectedFile).toBe('/file.txt');
      expect(result.current.state.settings).toEqual({ theme: 'dark' });
    });

    it('should provide field-level access via useSyncedField', () => {
      const { result } = renderHook(() => useSyncedField('selectedFile'));

      const [initialValue, setValue] = result.current;
      expect(initialValue).toBeNull();

      // Update via setter
      act(() => {
        setValue('/new-file.txt');
      });

      const [newValue] = result.current;
      expect(newValue).toBe('/new-file.txt');
    });

    it('should provide multi-field access via useSyncedFields', () => {
      // Set some initial state
      act(() => {
        useSyncedStore.setState({
          projectPath: '/my/project',
          selectedFile: '/my/file.txt',
        });
      });

      const { result } = renderHook(() =>
        useSyncedFields(['projectPath', 'selectedFile'] as const)
      );

      expect(result.current.projectPath).toBe('/my/project');
      expect(result.current.selectedFile).toBe('/my/file.txt');
    });
  });

  /**
   * NOTE: React → IDE synchronization via syncMiddleware is tested in:
   * - ui/tests/state/syncMiddleware.test.ts (unit tests)
   * - Manual testing using StateSyncVerification component in IDE
   *
   * The middleware requires complex setup with the bridge subscription
   * that is difficult to mock reliably in integration tests.
   */

  describe('IDE → React Synchronization (via updateFromIDE)', () => {
    it('should update React state when updateFromIDE is called', () => {
      const { result } = renderHook(() => useSyncedState());

      // Simulate IDE update
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          selectedFile: '/ide-updated-file.txt',
        });
      });

      expect(result.current.state.selectedFile).toBe('/ide-updated-file.txt');
    });

    it('should merge multiple IDE updates correctly', () => {
      const { result } = renderHook(() => useSyncedState());

      // Multiple updates
      act(() => {
        useSyncedStore.getState().updateFromIDE({ selectedFile: '/file.txt' });
        useSyncedStore.getState().updateFromIDE({ settings: { theme: 'dark' } });
        useSyncedStore.getState().updateFromIDE({ projectPath: '/test/project' });
      });

      expect(result.current.state.selectedFile).toBe('/file.txt');
      expect(result.current.state.settings).toEqual({ theme: 'dark' });
      expect(result.current.state.projectPath).toBe('/test/project');
    });

    it('should preserve existing state when applying partial updates', () => {
      const { result } = renderHook(() => useSyncedState());

      // Set initial state
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/project',
          selectedFile: '/file.txt',
          settings: { fontSize: 14 },
        });
      });

      // Partial update
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          selectedFile: '/new-file.txt',
        });
      });

      // Verify partial update applied and rest preserved
      expect(result.current.state.projectPath).toBe('/project');
      expect(result.current.state.selectedFile).toBe('/new-file.txt');
      expect(result.current.state.settings).toEqual({ fontSize: 14 });
    });
  });

  describe('Circular Update Prevention', () => {
    it('should not sync IDE-initiated updates back to IDE', async () => {
      const syncStateSpy = vi.spyOn(bridge, 'syncState');
      renderHook(() => useSyncedState());

      // IDE updates state
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          selectedFile: '/ide-file.txt',
        });
      });

      // Flush any pending changes
      act(() => {
        flushPendingChanges();
      });

      // Wait a bit to ensure no delayed sync
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should not have synced back to IDE
      expect(syncStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      const syncStateSpy = vi.spyOn(bridge, 'syncState');
      syncStateSpy.mockImplementation(() => {
        throw new Error('Sync failed');
      });

      const { result } = renderHook(() => useSyncedState());

      // State update should still work locally
      act(() => {
        result.current.updateField('selectedFile', '/error-test.txt');
      });

      expect(result.current.state.selectedFile).toBe('/error-test.txt');

      // Flush should not throw
      expect(() => {
        act(() => {
          flushPendingChanges();
        });
      }).not.toThrow();
    });
  });

  describe('State Initialization', () => {
    it('should provide initialize action for fetching initial state from IDE', () => {
      const { result } = renderHook(() => useSyncedState());

      expect(typeof result.current.initialize).toBe('function');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during initialization', async () => {
      // Mock bridge.call to return initial state
      const callSpy = vi.spyOn(bridge, 'call');
      const mockState: AppState = {
        projectPath: '/test/project',
        selectedFile: null,
        settings: {},
      };
      callSpy.mockResolvedValue(mockState);

      // Also mock ready to resolve immediately
      const readySpy = vi.spyOn(bridge, 'ready');
      readySpy.mockResolvedValue();

      const { result } = renderHook(() => useSyncedState());

      // Start initialization
      act(() => {
        result.current.initialize();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initialization completed successfully (no error)
      expect(result.current.error).toBeNull();
    });
  });
});
