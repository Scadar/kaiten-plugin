/**
 * Sync middleware for Zustand store
 * Propagates React state changes to IDE via bridge
 *
 * This middleware:
 * - Watches for state changes in the Zustand store
 * - Detects which AppState fields changed
 * - Sends only the changes to IDE via bridge.syncState()
 * - Debounces rapid updates to avoid flooding the bridge
 * - Filters out metadata fields (isLoading, error) that shouldn't sync
 * - Prevents circular updates by tracking update source
 */

import { StateCreator } from 'zustand';
import { bridge } from '@/bridge/JCEFBridge';
import type { AppState } from '@/bridge/types';

/**
 * Fields from AppState that should be synchronized to IDE
 */
const SYNCABLE_FIELDS: (keyof AppState)[] = [
  'projectPath',
  'selectedFile',
  'settings',
  'user',
  'tasks',
  'filters',
];

/**
 * Debounce configuration
 */
const DEBOUNCE_MS = 100; // Wait 100ms before sending changes to IDE

/**
 * Update source tracking to prevent circular updates
 */
let isUpdatingFromIDE = false;

/**
 * Detect changes between previous and current state
 * Returns only the fields that changed
 */
export function detectChanges(
  currentState: AppState,
  previousState: AppState
): Partial<AppState> {
  const changes: Partial<AppState> = {};

  for (const field of SYNCABLE_FIELDS) {
    const currentValue = currentState[field];
    const previousValue = previousState[field];

    // Deep comparison for objects and arrays
    if (!isEqual(currentValue, previousValue)) {
      (changes as Record<string, unknown>)[field] = currentValue;
    }
  }

  return changes;
}

/**
 * Deep equality check for values
 * Handles primitives, objects, and arrays
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;

  // Type check
  if (typeof a !== typeof b) return false;

  // Null/undefined check
  if (a == null || b == null) return false;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }

  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => {
      return isEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      );
    });
  }

  // Primitive comparison (already handled by === above, but explicit)
  return false;
}

/**
 * Debounce timer
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Pending changes to be sent to IDE
 */
let pendingChanges: Partial<AppState> = {};

/**
 * Send accumulated changes to IDE
 */
function flushChanges(): void {
  if (Object.keys(pendingChanges).length === 0) {
    return;
  }

  // Send to IDE via bridge
  bridge.syncState(pendingChanges);

  // Clear pending changes
  pendingChanges = {};
}

/**
 * Queue changes for syncing to IDE (with debouncing)
 */
function queueChanges(changes: Partial<AppState>): void {
  // Merge with pending changes
  pendingChanges = {
    ...pendingChanges,
    ...changes,
  };

  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // Set new timer
  debounceTimer = setTimeout(() => {
    flushChanges();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

/**
 * Extract AppState fields from store state
 */
function extractAppState(state: unknown): AppState {
  const appState: Partial<AppState> = {};

  for (const field of SYNCABLE_FIELDS) {
    if (field in (state as object)) {
      appState[field] = (state as Record<string, unknown>)[field] as never;
    }
  }

  return appState as AppState;
}

/**
 * Sync middleware implementation
 * This is a Zustand middleware that intercepts setState calls
 */
export const syncMiddleware = <T extends object>(
  config: StateCreator<T, [], []>
): StateCreator<T, [], []> => {
  return (set, get, api) => {
    // Track previous state
    let previousState = extractAppState(get());

    // Subscribe to store changes
    api.subscribe((currentFullState) => {
      // Skip if update is from IDE (to prevent circular updates)
      if (isUpdatingFromIDE) {
        return;
      }

      // Extract AppState fields
      const currentState = extractAppState(currentFullState);

      // Detect what changed
      const changes = detectChanges(currentState, previousState);

      // If changes exist, queue them for syncing
      if (Object.keys(changes).length > 0) {
        queueChanges(changes);
      }

      // Update previous state
      previousState = currentState;
    });

    // Wrap setState to track IDE updates
    const wrappedSet: typeof set = (partial, replace) => {
      // Check if this is an updateFromIDE call
      // We detect this by checking if the partial update is being called
      // with specific AppState fields only (not actions)
      const isIDEUpdate =
        typeof partial === 'object' &&
        !('initialize' in partial) &&
        !('reset' in partial) &&
        !('updateFromIDE' in partial) &&
        !('setError' in partial);

      if (isIDEUpdate) {
        isUpdatingFromIDE = true;
      }

      // Call original setState with proper type handling
      if (replace === true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(partial as any, true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(partial as any, replace as false | undefined);
      }

      if (isIDEUpdate) {
        // Reset flag after a microtask to allow the update to propagate
        Promise.resolve().then(() => {
          isUpdatingFromIDE = false;
        });
      }
    };

    return config(wrappedSet, get, api);
  };
};

/**
 * Create sync middleware with configuration
 */
export interface SyncMiddlewareConfig {
  /**
   * Debounce delay in milliseconds (default: 100ms)
   */
  debounceMs?: number;

  /**
   * Custom fields to sync (default: all AppState fields)
   */
  syncableFields?: (keyof AppState)[];

  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;
}

/**
 * Create configured sync middleware
 *
 * @param config - Middleware configuration
 * @returns Configured sync middleware
 */
export function createSyncMiddleware<T extends object>(
  _config: SyncMiddlewareConfig = {}
): (stateCreator: StateCreator<T, [], []>) => StateCreator<T, [], []> {
  // TODO: Apply custom configuration if needed
  // For now, we use the default configuration
  return syncMiddleware;
}

/**
 * Mark an update as coming from IDE
 * This prevents the middleware from syncing it back
 *
 * @param fn - Function to execute as IDE update
 *
 * @example
 * ```ts
 * markAsIDEUpdate(() => {
 *   useSyncedStore.setState({ projectPath: '/from/ide' });
 * });
 * ```
 */
export function markAsIDEUpdate(fn: () => void): void {
  isUpdatingFromIDE = true;
  try {
    fn();
  } finally {
    // Reset flag after a microtask
    Promise.resolve().then(() => {
      isUpdatingFromIDE = false;
    });
  }
}

/**
 * Flush pending changes immediately (for testing)
 * Normally changes are debounced
 */
export function flushPendingChanges(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  flushChanges();
}

/**
 * Clear all pending changes (for testing)
 */
export function clearPendingChanges(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pendingChanges = {};
}

/**
 * Get current pending changes (for testing)
 */
export function getPendingChanges(): Partial<AppState> {
  return { ...pendingChanges };
}
