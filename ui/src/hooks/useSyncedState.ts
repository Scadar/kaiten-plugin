/**
 * React hook for bidirectional state synchronization with IDE
 *
 * This hook provides a convenient interface for React components to:
 * - Access state that is synchronized with the IDE
 * - Update state (which automatically syncs to IDE via middleware)
 * - Subscribe to specific state slices for optimal re-rendering
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Access full state
 *   const state = useSyncedState();
 *
 *   // Access specific field with selector
 *   const projectPath = useSyncedState((s) => s.projectPath);
 *
 *   // Access with custom selector
 *   const hasProject = useSyncedState((s) => s.projectPath !== null);
 *
 *   return <div>Project: {projectPath}</div>;
 * }
 * ```
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useSyncedStore, type SyncStore } from '@/state/syncStore';
import type { AppState } from '@/bridge/types';

/**
 * Type for state selector function
 */
export type StateSelector<T> = (state: SyncStore) => T;

/**
 * Hook return type with state and actions
 */
export interface UseSyncedStateReturn {
  /**
   * Current state snapshot
   */
  state: SyncStore;

  /**
   * Update a specific field in the state
   * This will automatically sync to IDE via middleware
   */
  updateField: <K extends keyof AppState>(
    field: K,
    value: AppState[K]
  ) => void;

  /**
   * Update multiple fields at once
   * This will automatically sync to IDE via middleware
   */
  updateFields: (updates: Partial<AppState>) => void;

  /**
   * Initialize state from IDE
   * This fetches the current state from IDE and sets it in the store
   */
  initialize: () => Promise<void>;

  /**
   * Check if store is ready (not loading and no error)
   */
  isReady: boolean;

  /**
   * Check if store is currently loading
   */
  isLoading: boolean;

  /**
   * Current error, if any
   */
  error: Error | null;
}

/**
 * Main hook with optional selector for accessing synced state
 *
 * @param selector - Optional selector function to extract specific state slice
 * @returns Selected state or full state with actions
 *
 * @example
 * ```tsx
 * // Get full state
 * const state = useSyncedState();
 *
 * // Get specific field
 * const projectPath = useSyncedState((s) => s.projectPath);
 *
 * // Get derived state
 * const hasUser = useSyncedState((s) => s.user !== null);
 * ```
 */
export function useSyncedState(): UseSyncedStateReturn;
export function useSyncedState<T>(selector: StateSelector<T>): T;
export function useSyncedState<T>(
  selector?: StateSelector<T>
): T | UseSyncedStateReturn {
  // If selector provided, use it directly with Zustand
  if (selector) {
    return useSyncedStore(selector);
  }

  // Get full state from store
  const state = useSyncedStore();

  // Create stable callback for updating a single field
  const updateField = useCallback(
    <K extends keyof AppState>(field: K, value: AppState[K]) => {
      useSyncedStore.setState((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  // Create stable callback for updating multiple fields
  const updateFields = useCallback((updates: Partial<AppState>) => {
    useSyncedStore.setState((current) => ({
      ...current,
      ...updates,
    }));
  }, []);

  // Get actions from store
  const { initialize } = state;

  return {
    state,
    updateField,
    updateFields,
    initialize,
    isReady: !state.isLoading && !state.error,
    isLoading: state.isLoading,
    error: state.error,
  };
}

/**
 * Hook to access a specific field from synced state
 * Provides both the value and a setter function
 *
 * @param field - The field name from AppState
 * @returns Tuple of [value, setValue]
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [projectPath, setProjectPath] = useSyncedField('projectPath');
 *
 *   return (
 *     <div>
 *       <p>Project: {projectPath}</p>
 *       <button onClick={() => setProjectPath('/new/path')}>
 *         Change Path
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncedField<K extends keyof AppState>(
  field: K
): [AppState[K], (value: AppState[K]) => void] {
  // Get current value with selector
  const value = useSyncedStore((state) => state[field]);

  // Create stable setter
  const setValue = useCallback(
    (newValue: AppState[K]) => {
      useSyncedStore.setState((current) => ({
        ...current,
        [field]: newValue,
      }));
    },
    [field]
  );

  return [value, setValue];
}

/**
 * Hook to check if the store is ready
 * Optionally initialize the store on mount
 *
 * @param autoInitialize - Whether to automatically initialize on mount (default: false)
 * @returns Object with ready state and initialize function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReady, isLoading, error, initialize } = useSyncedReady(true);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!isReady) return <div>Not ready</div>;
 *
 *   return <div>Ready!</div>;
 * }
 * ```
 */
export function useSyncedReady(autoInitialize = false): {
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
} {
  const isLoading = useSyncedStore((state) => state.isLoading);
  const error = useSyncedStore((state) => state.error);
  const initialize = useSyncedStore((state) => state.initialize);

  // Track if we've already initialized to avoid duplicate calls
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (autoInitialize && !hasInitialized.current) {
      hasInitialized.current = true;
      // Call initialize directly from store to avoid dependency issues
      useSyncedStore.getState().initialize();
    }
    // Only depend on autoInitialize to prevent re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitialize]);

  return {
    isReady: !isLoading && !error,
    isLoading,
    error,
    initialize,
  };
}

/**
 * Hook to subscribe to specific events from synced state changes
 * This is useful when you need to react to state changes without re-rendering
 *
 * @param field - The field to watch for changes
 * @param callback - Callback to invoke when field changes
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   // Log when project path changes
 *   useSyncedStateEffect('projectPath', (newPath) => {
 *     console.log('Project path changed:', newPath);
 *   });
 *
 *   return <div>Component content</div>;
 * }
 * ```
 */
export function useSyncedStateEffect<K extends keyof AppState>(
  field: K,
  callback: (value: AppState[K], previousValue: AppState[K]) => void
): void {
  // Track previous value
  const previousValueRef = useRef<AppState[K]>();
  const callbackRef = useRef(callback);

  // Update callback ref on each render to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Subscribe to field changes
  useEffect(() => {
    // Initialize previous value on mount
    previousValueRef.current = useSyncedStore.getState()[field];

    const unsubscribe = useSyncedStore.subscribe((state) => {
      const currentValue = state[field];
      const previousValue = previousValueRef.current;

      // Check if value actually changed
      if (currentValue !== previousValue) {
        callbackRef.current(currentValue, previousValue as AppState[K]);
        previousValueRef.current = currentValue;
      }
    });

    return unsubscribe;
  }, [field]);
}

/**
 * Shallow equality check for objects
 */
function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }

  return true;
}

/**
 * Hook to access multiple fields at once
 * Returns an object with the selected fields
 *
 * @param fields - Array of field names to select
 * @returns Object with selected field values
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { projectPath, selectedFile, user } = useSyncedFields([
 *     'projectPath',
 *     'selectedFile',
 *     'user',
 *   ]);
 *
 *   return (
 *     <div>
 *       <p>Project: {projectPath}</p>
 *       <p>File: {selectedFile}</p>
 *       <p>User: {user?.name}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncedFields<K extends keyof AppState>(
  fields: readonly K[]
): Pick<AppState, K> {
  // Store previous result to implement shallow equality
  const previousRef = useRef<Pick<AppState, K> | null>(null);

  // Select fields from store
  const result = useSyncedStore((state) => {
    const newResult = {} as Pick<AppState, K>;
    for (const field of fields) {
      newResult[field] = state[field];
    }

    // If previous result exists and is shallowly equal, return it to avoid re-renders
    if (previousRef.current && shallowEqual(previousRef.current, newResult)) {
      return previousRef.current;
    }

    // Store and return new result
    previousRef.current = newResult;
    return newResult;
  });

  return result;
}

/**
 * Hook to get a derived value from synced state
 * Similar to useSyncedState with selector, but with explicit typing
 *
 * @param selector - Function to derive value from state
 * @param deps - Optional dependencies array for the selector (default: [])
 * @returns Derived value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const taskCount = useSyncedDerived((s) => s.tasks.length);
 *   const hasOpenTasks = useSyncedDerived(
 *     (s) => s.tasks.some(t => t.status === 'open')
 *   );
 *
 *   return (
 *     <div>
 *       <p>Total tasks: {taskCount}</p>
 *       <p>Has open tasks: {hasOpenTasks ? 'Yes' : 'No'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncedDerived<T>(
  selector: (state: SyncStore) => T,
  deps: unknown[] = []
): T {
  // Store previous result for shallow equality check (useful for object results)
  const previousRef = useRef<T | undefined>(undefined);
  const selectorRef = useRef(selector);

  // Update selector when deps change
  useEffect(() => {
    selectorRef.current = selector;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Use selector with shallow equality for objects
  return useSyncedStore((state) => {
    const newResult = selectorRef.current(state);

    // For objects, use shallow equality to avoid unnecessary re-renders
    if (
      previousRef.current !== undefined &&
      typeof newResult === 'object' &&
      newResult !== null &&
      typeof previousRef.current === 'object' &&
      previousRef.current !== null
    ) {
      if (shallowEqual(previousRef.current as Record<string, unknown>, newResult as Record<string, unknown>)) {
        return previousRef.current;
      }
    }

    // For primitives or different values, update and return
    previousRef.current = newResult;
    return newResult;
  });
}
