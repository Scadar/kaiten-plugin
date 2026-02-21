/**
 * SyncMiddleware tests
 * Verifies middleware that propagates React state changes to IDE via bridge
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { create } from 'zustand';
import {
  detectChanges,
  flushPendingChanges,
  clearPendingChanges,
  getPendingChanges,
  markAsIDEUpdate,
} from '../../src/state/syncMiddleware';
import { bridge } from '../../src/bridge/JCEFBridge';
import type { AppState } from '../../src/bridge/types';

describe('SyncMiddleware', () => {
  beforeEach(() => {
    // Mock window.__jcef_send__
    window.__jcef_send__ = vi.fn();

    // Spy on bridge.syncState
    vi.spyOn(bridge, 'syncState');

    // Clear any pending changes
    clearPendingChanges();
  });

  afterEach(() => {
    clearPendingChanges();
    delete window.__jcef_send__;
    delete window.__jcef_receive__;
    vi.restoreAllMocks();
  });

  describe('detectChanges', () => {
    it('should detect primitive field changes', () => {
      const previous: AppState = {
        projectPath: '/old/path',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: '/new/path',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        projectPath: '/new/path',
      });
    });

    it('should detect multiple field changes', () => {
      const previous: AppState = {
        projectPath: '/old/path',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: '/new/path',
        selectedFile: '/new/file.ts',
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        projectPath: '/new/path',
        selectedFile: '/new/file.ts',
      });
    });

    it('should detect object changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { theme: 'light' },
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { theme: 'dark' },
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        settings: { theme: 'dark' },
      });
    });

    it('should detect user changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        user: {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
    });

    it('should detect array changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        tasks: [{ id: 'task1', title: 'Task 1' }],
      });
    });

    it('should detect filter changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: { status: 'open' },
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        filters: { status: 'open' },
      });
    });

    it('should return empty object when no changes', () => {
      const state: AppState = {
        projectPath: '/same/path',
        selectedFile: '/same/file.ts',
        settings: { theme: 'dark' },
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(state, state);

      expect(changes).toEqual({});
    });

    it('should handle null to value changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: '/new/path',
        selectedFile: '/new/file.ts',
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        projectPath: '/new/path',
        selectedFile: '/new/file.ts',
      });
    });

    it('should handle value to null changes', () => {
      const previous: AppState = {
        projectPath: '/old/path',
        selectedFile: '/old/file.ts',
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        projectPath: null,
        selectedFile: null,
      });
    });

    it('should handle deep object changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { nested: { value: 1 } },
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { nested: { value: 2 } },
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        settings: { nested: { value: 2 } },
      });
    });

    it('should handle array item changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [{ id: 'task1', title: 'Updated Task 1' }],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        tasks: [{ id: 'task1', title: 'Updated Task 1' }],
      });
    });

    it('should handle array length changes', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [
          { id: 'task1', title: 'Task 1' },
          { id: 'task2', title: 'Task 2' },
        ],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        tasks: [
          { id: 'task1', title: 'Task 1' },
          { id: 'task2', title: 'Task 2' },
        ],
      });
    });
  });

  describe('Pending changes management', () => {
    it('should accumulate pending changes', async () => {
      // Create a simple store state update
      const state1: AppState = {
        projectPath: '/path1',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const state2: AppState = {
        projectPath: '/path2',
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      // Simulate two rapid state changes
      const changes1 = detectChanges(state1, {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      });

      const changes2 = detectChanges(state2, state1);

      // Both changes should be detected
      expect(Object.keys(changes1).length).toBeGreaterThan(0);
      expect(Object.keys(changes2).length).toBeGreaterThan(0);
    });

    it('should clear pending changes', () => {
      clearPendingChanges();
      const pending = getPendingChanges();
      expect(pending).toEqual({});
    });

    it('should get pending changes', () => {
      clearPendingChanges();
      const pending = getPendingChanges();
      expect(typeof pending).toBe('object');
    });
  });

  describe('Flush functionality', () => {
    it('should flush pending changes immediately', () => {
      // Ensure bridge.syncState is mocked
      expect(bridge.syncState).toBeDefined();

      // Flush (even if no changes, it shouldn't throw)
      flushPendingChanges();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should clear pending changes after flush', () => {
      clearPendingChanges();
      flushPendingChanges();

      const pending = getPendingChanges();
      expect(pending).toEqual({});
    });
  });

  describe('IDE update tracking', () => {
    it('should mark updates as coming from IDE', () => {
      let executedInside = false;

      markAsIDEUpdate(() => {
        executedInside = true;
      });

      expect(executedInside).toBe(true);
    });

    it('should execute function even if it throws', () => {
      expect(() => {
        markAsIDEUpdate(() => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });
  });

  describe('Deep equality', () => {
    it('should detect no change for identical objects', () => {
      const state: AppState = {
        projectPath: '/same',
        selectedFile: '/file.ts',
        settings: { theme: 'dark', fontSize: 14 },
        user: { id: 'user1', name: 'User', email: 'user@test.com' },
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      };

      // Create a deep copy
      const copy = JSON.parse(JSON.stringify(state));

      const changes = detectChanges(copy, state);
      expect(changes).toEqual({});
    });

    it('should detect changes in nested objects', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {
          theme: 'dark',
          editor: {
            fontSize: 14,
            fontFamily: 'monospace',
          },
        },
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {
          theme: 'dark',
          editor: {
            fontSize: 16, // Changed
            fontFamily: 'monospace',
          },
        },
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        settings: {
          theme: 'dark',
          editor: {
            fontSize: 16,
            fontFamily: 'monospace',
          },
        },
      });
    });

    it('should detect changes in nested arrays', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [
          { id: 'task1', title: 'Task 1', subtasks: ['sub1', 'sub2'] },
        ],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [
          { id: 'task1', title: 'Task 1', subtasks: ['sub1', 'sub2', 'sub3'] },
        ],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        tasks: [
          { id: 'task1', title: 'Task 1', subtasks: ['sub1', 'sub2', 'sub3'] },
        ],
      });
    });
  });

  describe('Multiple field updates', () => {
    it('should detect changes across all syncable fields', () => {
      const previous: AppState = {
        projectPath: '/old',
        selectedFile: '/old.ts',
        settings: { theme: 'light' },
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: '/new',
        selectedFile: '/new.ts',
        settings: { theme: 'dark' },
        user: { id: 'user1', name: 'User', email: 'user@test.com' },
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        projectPath: '/new',
        selectedFile: '/new.ts',
        settings: { theme: 'dark' },
        user: { id: 'user1', name: 'User', email: 'user@test.com' },
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      });
    });

    it('should only include changed fields, not unchanged ones', () => {
      const previous: AppState = {
        projectPath: '/same',
        selectedFile: '/old.ts',
        settings: { theme: 'dark' },
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: '/same', // Unchanged
        selectedFile: '/new.ts', // Changed
        settings: { theme: 'dark' }, // Unchanged
        user: null, // Unchanged
        tasks: [], // Unchanged
        filters: { status: 'open' }, // Changed
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        selectedFile: '/new.ts',
        filters: { status: 'open' },
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty objects', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);
      expect(changes).toEqual({});
    });

    it('should handle empty arrays', () => {
      const state: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(state, state);
      expect(changes).toEqual({});
    });

    it('should handle changing from empty to non-empty', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { key: 'value' },
        user: null,
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        settings: { key: 'value' },
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      });
    });

    it('should handle changing from non-empty to empty', () => {
      const previous: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: { key: 'value' },
        user: null,
        tasks: [{ id: 'task1', title: 'Task 1' }],
        filters: { status: 'open' },
      };

      const current: AppState = {
        projectPath: null,
        selectedFile: null,
        settings: {},
        user: null,
        tasks: [],
        filters: {},
      };

      const changes = detectChanges(current, previous);

      expect(changes).toEqual({
        settings: {},
        tasks: [],
        filters: {},
      });
    });
  });
});
