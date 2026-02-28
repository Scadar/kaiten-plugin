/**
 * useSyncedState hook tests
 * Verifies React hook for bidirectional state synchronization with IDE
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useSyncedState,
  useSyncedField,
  useSyncedReady,
  useSyncedStateEffect,
  useSyncedFields,
  useSyncedDerived,
} from '../../src/hooks/useSyncedState';
import { useSyncedStore, disposeSyncStore } from '../../src/state/syncStore';

import type { AppState } from '../../src/bridge/types';

describe('useSyncedState', () => {
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

  describe('useSyncedState (main hook)', () => {
    it('should return full state with actions when no selector provided', () => {
      const { result } = renderHook(() => useSyncedState());

      expect(result.current.state).toBeDefined();
      expect(result.current.updateField).toBeInstanceOf(Function);
      expect(result.current.updateFields).toBeInstanceOf(Function);
      expect(result.current.initialize).toBeInstanceOf(Function);
      expect(result.current.isReady).toBe(true); // Initial state is ready
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return selected value when selector provided', () => {
      // Set a value first
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
        });
      });

      const { result } = renderHook(() =>
        useSyncedState((s) => s.projectPath)
      );

      expect(result.current).toBe('/test/path');
    });

    it('should allow selecting derived state', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
        });
      });

      const { result } = renderHook(() =>
        useSyncedState((s) => s.projectPath !== null)
      );

      expect(result.current).toBe(true);
    });

    it('should update field using updateField', () => {
      const { result } = renderHook(() => useSyncedState());

      act(() => {
        result.current.updateField('projectPath', '/new/path');
      });

      expect(result.current.state.projectPath).toBe('/new/path');
    });

    it('should update multiple fields using updateFields', () => {
      const { result } = renderHook(() => useSyncedState());

      act(() => {
        result.current.updateFields({
          projectPath: '/new/path',
          selectedFile: '/new/file.ts',
        });
      });

      expect(result.current.state.projectPath).toBe('/new/path');
      expect(result.current.state.selectedFile).toBe('/new/file.ts');
    });

    it('should preserve other fields when updating single field', () => {
      const { result } = renderHook(() => useSyncedState());

      // Set initial values
      act(() => {
        result.current.updateFields({
          projectPath: '/path',
          selectedFile: '/file.ts',
        });
      });

      // Update only projectPath
      act(() => {
        result.current.updateField('projectPath', '/new/path');
      });

      expect(result.current.state.projectPath).toBe('/new/path');
      expect(result.current.state.selectedFile).toBe('/file.ts');
    });

    it('should report ready state correctly', () => {
      const { result } = renderHook(() => useSyncedState());

      // Initial state should be ready
      expect(result.current.isReady).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      // Set loading state
      act(() => {
        useSyncedStore.setState({ isLoading: true });
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.isLoading).toBe(true);

      // Set error state
      act(() => {
        useSyncedStore.setState({ isLoading: false });
        useSyncedStore.getState().setError(new Error('Test error'));
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);

      // Clear error
      act(() => {
        useSyncedStore.getState().setError(null);
      });

      expect(result.current.isReady).toBe(true);
    });

    it('should re-render when selected state changes', () => {
      const { result } = renderHook(() =>
        useSyncedState((s) => s.projectPath)
      );

      expect(result.current).toBeNull();

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/new/path',
        });
      });

      expect(result.current).toBe('/new/path');
    });

    it('should not re-render when unrelated state changes', () => {
      const { result } = renderHook(() =>
        useSyncedState((s) => s.projectPath)
      );

      const renderCount = result.current;

      // Update unrelated field
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          selectedFile: '/some/file.ts',
        });
      });

      // Should still be the same reference (no re-render)
      expect(result.current).toBe(renderCount);
    });
  });

  describe('useSyncedField', () => {
    it('should return current value and setter', () => {
      const { result } = renderHook(() => useSyncedField('projectPath'));

      const [value, setValue] = result.current;

      expect(value).toBeNull();
      expect(typeof setValue).toBe('function');
    });

    it('should update value when setter is called', () => {
      const { result } = renderHook(() => useSyncedField('projectPath'));

      act(() => {
        const [, setValue] = result.current;
        setValue('/new/path');
      });

      const [value] = result.current;
      expect(value).toBe('/new/path');
    });

    it('should sync with store state', () => {
      const { result } = renderHook(() => useSyncedField('projectPath'));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/from/store',
        });
      });

      const [value] = result.current;
      expect(value).toBe('/from/store');
    });

    it('should work with different field types', () => {
      // Test with projectPath field (string)
      const { result: pathResult } = renderHook(() => useSyncedField('projectPath'));

      act(() => {
        const [, setPath] = pathResult.current;
        setPath('/test/path');
      });

      const [path] = pathResult.current;
      expect(path).toBe('/test/path');

      // Test with settings field (object)
      const { result: settingsResult } = renderHook(() =>
        useSyncedField('settings')
      );

      act(() => {
        const [, setSettings] = settingsResult.current;
        setSettings({ theme: 'dark', fontSize: 14 });
      });

      const [settings] = settingsResult.current;
      expect(settings).toEqual({ theme: 'dark', fontSize: 14 });
    });

    it('should have stable setter reference', () => {
      const { result, rerender } = renderHook(() =>
        useSyncedField('projectPath')
      );

      const [, firstSetter] = result.current;

      rerender();

      const [, secondSetter] = result.current;

      expect(firstSetter).toBe(secondSetter);
    });
  });

  describe('useSyncedReady', () => {
    it('should return ready state by default', () => {
      const { result } = renderHook(() => useSyncedReady());

      expect(result.current.isReady).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.initialize).toBe('function');
    });

    it('should reflect loading state', () => {
      const { result } = renderHook(() => useSyncedReady());

      act(() => {
        useSyncedStore.setState({ isLoading: true });
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect error state', () => {
      const { result } = renderHook(() => useSyncedReady());

      const error = new Error('Test error');

      act(() => {
        useSyncedStore.getState().setError(error);
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.error).toBe(error);
    });

    it('should not auto-initialize by default', () => {
      const initializeSpy = vi.spyOn(
        useSyncedStore.getState(),
        'initialize'
      );

      renderHook(() => useSyncedReady());

      expect(initializeSpy).not.toHaveBeenCalled();
    });

    it('should auto-initialize when autoInitialize is true', async () => {
      const initializeSpy = vi
        .spyOn(useSyncedStore.getState(), 'initialize')
        .mockResolvedValue();

      renderHook(() => useSyncedReady(true));

      await waitFor(() => {
        expect(initializeSpy).toHaveBeenCalled();
      });
    });

    it('should not initialize multiple times', async () => {
      let initializeCallCount = 0;

      // Replace initialize with a function that counts calls
      const originalInitialize = useSyncedStore.getState().initialize;
      useSyncedStore.setState({
        initialize: async () => {
          initializeCallCount++;
          return Promise.resolve();
        },
      });

      const { rerender } = renderHook(() => useSyncedReady(true));

      // Wait for first initialization
      await waitFor(() => {
        expect(initializeCallCount).toBe(1);
      });

      // Rerender should not trigger another initialization
      rerender();

      // Wait a bit to ensure no additional calls happen
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still be 1
      expect(initializeCallCount).toBe(1);

      // Restore original initialize
      useSyncedStore.setState({ initialize: originalInitialize });
    });
  });

  describe('useSyncedStateEffect', () => {
    it('should call callback when field changes', () => {
      const callback = vi.fn();

      renderHook(() => useSyncedStateEffect('projectPath', callback));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/new/path',
        });
      });

      expect(callback).toHaveBeenCalledWith('/new/path', null);
    });

    it('should call callback with previous value', () => {
      const callback = vi.fn();

      // Set initial value
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/old/path',
        });
      });

      renderHook(() => useSyncedStateEffect('projectPath', callback));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/new/path',
        });
      });

      expect(callback).toHaveBeenCalledWith('/new/path', '/old/path');
    });

    it('should not call callback when unrelated field changes', () => {
      const callback = vi.fn();

      renderHook(() => useSyncedStateEffect('projectPath', callback));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          selectedFile: '/some/file.ts',
        });
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not call callback when field value is the same', () => {
      const callback = vi.fn();

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/same/path',
        });
      });

      renderHook(() => useSyncedStateEffect('projectPath', callback));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/same/path', // Same value
        });
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback multiple times for multiple changes', () => {
      const callback = vi.fn();

      renderHook(() => useSyncedStateEffect('projectPath', callback));

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/path1',
        });
      });

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/path2',
        });
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, '/path1', null);
      expect(callback).toHaveBeenNthCalledWith(2, '/path2', '/path1');
    });

    it('should work with complex field types', () => {
      const callback = vi.fn();

      renderHook(() => useSyncedStateEffect('settings', callback));

      const settings = {
        theme: 'dark',
        fontSize: 14,
        notifications: { enabled: true },
      };

      act(() => {
        useSyncedStore.getState().updateFromIDE({ settings });
      });

      expect(callback).toHaveBeenCalledWith(settings, {});
    });

    it('should unsubscribe on unmount', () => {
      const callback = vi.fn();

      const { unmount } = renderHook(() =>
        useSyncedStateEffect('projectPath', callback)
      );

      // Unmount
      unmount();

      // Update state after unmount
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/new/path',
        });
      });

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('useSyncedFields', () => {
    it('should return selected fields', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
          selectedFile: '/test/file.ts',
        });
      });

      const { result } = renderHook(() =>
        useSyncedFields(['projectPath', 'selectedFile'])
      );

      expect(result.current.projectPath).toBe('/test/path');
      expect(result.current.selectedFile).toBe('/test/file.ts');
    });

    it('should only include selected fields', () => {
      const { result } = renderHook(() =>
        useSyncedFields(['projectPath', 'selectedFile'])
      );

      // Should not have other fields
      expect('user' in result.current).toBe(false);
      expect('tasks' in result.current).toBe(false);
    });

    it('should update when any selected field changes', () => {
      const { result } = renderHook(() =>
        useSyncedFields(['projectPath', 'selectedFile'])
      );

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/new/path',
        });
      });

      expect(result.current.projectPath).toBe('/new/path');
    });

    it('should work with single field', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
        });
      });

      const { result } = renderHook(() => useSyncedFields(['projectPath']));

      expect(result.current.projectPath).toBe('/test/path');
    });

    it('should work with all fields', () => {
      const { result } = renderHook(() =>
        useSyncedFields([
          'projectPath',
          'selectedFile',
          'settings',
        ])
      );

      expect(result.current).toEqual({
        projectPath: null,
        selectedFile: null,
        settings: {},
      });
    });
  });

  describe('useSyncedDerived', () => {
    it('should return derived value', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
          selectedFile: '/file.ts',
        });
      });

      const { result } = renderHook(() =>
        useSyncedDerived((s) => s.projectPath?.split('/').length ?? 0)
      );

      expect(result.current).toBe(3);
    });

    it('should recompute when dependency changes', () => {
      const { result } = renderHook(() =>
        useSyncedDerived((s) => s.projectPath?.split('/').length ?? 0)
      );

      expect(result.current).toBe(0);

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
        });
      });

      expect(result.current).toBe(3);
    });

    it('should work with complex derived state', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
          selectedFile: '/test/file.ts',
        });
      });

      const { result } = renderHook(() =>
        useSyncedDerived(
          (s) => s.projectPath !== null && s.selectedFile !== null
        )
      );

      expect(result.current).toBe(true);
    });

    it('should work with object derived state', () => {
      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
          selectedFile: '/test/file.ts',
        });
      });

      const { result } = renderHook(() =>
        useSyncedDerived((s) => ({
          hasProject: s.projectPath !== null,
          hasFile: s.selectedFile !== null,
          filePath: s.selectedFile,
        }))
      );

      expect(result.current).toEqual({
        hasProject: true,
        hasFile: true,
        filePath: '/test/file.ts',
      });
    });

    it('should support custom dependencies', () => {
      const customMultiplier = 2;

      const { result, rerender } = renderHook(
        ({ multiplier }) =>
          useSyncedDerived((s) => (s.projectPath?.split('/').length ?? 0) * multiplier, [multiplier]),
        {
          initialProps: { multiplier: customMultiplier },
        }
      );

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/test/path',
        });
      });

      expect(result.current).toBe(6); // 3 * 2

      // Rerender with new multiplier
      rerender({ multiplier: 3 });

      expect(result.current).toBe(9); // 3 * 3
    });
  });

  describe('Integration tests', () => {
    it('should work with multiple hooks accessing same state', () => {
      const { result: result1 } = renderHook(() =>
        useSyncedState((s) => s.projectPath)
      );
      const { result: result2 } = renderHook(() =>
        useSyncedField('projectPath')
      );

      act(() => {
        useSyncedStore.getState().updateFromIDE({
          projectPath: '/shared/path',
        });
      });

      expect(result1.current).toBe('/shared/path');
      expect(result2.current[0]).toBe('/shared/path');
    });

    it('should propagate updates across hooks', () => {
      const { result: stateResult } = renderHook(() => useSyncedState());
      const { result: fieldResult } = renderHook(() =>
        useSyncedField('projectPath')
      );

      act(() => {
        stateResult.current.updateField('projectPath', '/from/state');
      });

      expect(fieldResult.current[0]).toBe('/from/state');

      act(() => {
        const [, setValue] = fieldResult.current;
        setValue('/from/field');
      });

      expect(stateResult.current.state.projectPath).toBe('/from/field');
    });

    it('should work with complex state updates', () => {
      const { result } = renderHook(() => useSyncedState());

      const updates: Partial<AppState> = {
        projectPath: '/complex/path',
        selectedFile: '/complex/file.ts',
        settings: { theme: 'dark', fontSize: 14 },
      };

      act(() => {
        result.current.updateFields(updates);
      });

      expect(result.current.state.projectPath).toBe('/complex/path');
      expect(result.current.state.selectedFile).toBe('/complex/file.ts');
      expect(result.current.state.settings).toEqual(updates.settings);
    });
  });
});
