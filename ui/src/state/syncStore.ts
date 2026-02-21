/**
 * Zustand store with bridge event subscription for IDE state updates
 *
 * This store:
 * - Mirrors IDE state in React
 * - Subscribes to state:update events from IDE
 * - Provides type-safe state access
 * - Initializes state from IDE via RPC call
 */

import { create } from 'zustand';
import { bridge } from '@/bridge/JCEFBridge';
import type { AppState } from '@/bridge/types';

/**
 * Store state interface extends AppState with loading/error states
 */
export interface SyncStoreState extends AppState {
  /**
   * Whether initial state is being loaded from IDE
   */
  isLoading: boolean;

  /**
   * Error during state initialization or sync
   */
  error: Error | null;
}

/**
 * Store actions for manual state management
 */
export interface SyncStoreActions {
  /**
   * Initialize state from IDE via RPC call
   */
  initialize: () => Promise<void>;

  /**
   * Reset store to initial state
   */
  reset: () => void;

  /**
   * Update store state (used internally by bridge subscription)
   */
  updateFromIDE: (updates: Partial<AppState>) => void;

  /**
   * Set error state
   */
  setError: (error: Error | null) => void;
}

/**
 * Complete store type
 */
export type SyncStore = SyncStoreState & SyncStoreActions;

/**
 * Initial state
 */
const initialState: SyncStoreState = {
  projectPath: null,
  selectedFile: null,
  settings: {},
  user: null,
  tasks: [],
  filters: {},
  isLoading: false,
  error: null,
};

/**
 * Zustand store with IDE state synchronization
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const projectPath = useSyncedStore((state) => state.projectPath);
 *   const user = useSyncedStore((state) => state.user);
 *
 *   return <div>Project: {projectPath}, User: {user?.name}</div>;
 * }
 * ```
 */
export const useSyncedStore = create<SyncStore>((set, _get) => ({
  ...initialState,

  /**
   * Initialize state from IDE
   */
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      // Wait for bridge to be ready
      await bridge.ready();

      // Fetch initial state from IDE
      const state = await bridge.call('getState', undefined);

      // Update store with IDE state
      set({
        ...state,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[SyncStore] Failed to initialize state:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to initialize state'),
      });
    }
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
  },

  /**
   * Update store state from IDE
   */
  updateFromIDE: (updates: Partial<AppState>) => {
    set((state) => ({
      ...state,
      ...updates,
    }));
  },

  /**
   * Set error state
   */
  setError: (error: Error | null) => {
    set({ error });
  },
}));

/**
 * Bridge event subscription
 */
let unsubscribe: (() => void) | null = null;

/**
 * Initialize bridge subscription
 * This is called lazily when the store is first used
 */
function initializeBridgeSubscription(): void {
  if (unsubscribe) {
    return; // Already initialized
  }

  // Subscribe to IDE state updates
  unsubscribe = bridge.on('state:update', (updates: Partial<AppState>) => {
    // Update store with new state from IDE
    useSyncedStore.getState().updateFromIDE(updates);
  });
}

// Initialize subscription immediately (will be set up when bridge is ready)
initializeBridgeSubscription();

/**
 * Cleanup function for testing/HMR
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });
}

/**
 * Export cleanup function for manual disposal if needed
 */
export function disposeSyncStore(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  useSyncedStore.getState().reset();
}

/**
 * Selector helpers for common state access patterns
 */
export const syncStoreSelectors = {
  /**
   * Select project path
   */
  projectPath: (state: SyncStore) => state.projectPath,

  /**
   * Select selected file
   */
  selectedFile: (state: SyncStore) => state.selectedFile,

  /**
   * Select user
   */
  user: (state: SyncStore) => state.user,

  /**
   * Select all tasks
   */
  tasks: (state: SyncStore) => state.tasks,

  /**
   * Select filters
   */
  filters: (state: SyncStore) => state.filters,

  /**
   * Select settings
   */
  settings: (state: SyncStore) => state.settings,

  /**
   * Select loading state
   */
  isLoading: (state: SyncStore) => state.isLoading,

  /**
   * Select error state
   */
  error: (state: SyncStore) => state.error,

  /**
   * Check if store is ready (not loading and no error)
   */
  isReady: (state: SyncStore) => !state.isLoading && !state.error,
};
