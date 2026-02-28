import { QueryClient } from '@tanstack/react-query';

/**
 * Cache configuration constants
 * Mirrors the TTL behavior from Kotlin CacheManager
 */
export const CACHE_CONFIG = {
  /**
   * Time until data is considered stale (5 minutes)
   * Equivalent to CacheManager's ttlMinutes default
   */
  STALE_TIME: 5 * 60 * 1000, // 5 minutes in milliseconds

  /**
   * Time until unused data is garbage collected (30 minutes)
   * Provides longer retention for better UX
   */
  GC_TIME: 30 * 60 * 1000, // 30 minutes in milliseconds

  /**
   * Number of retry attempts for failed queries
   */
  RETRY_COUNT: 3,

  /**
   * Delay between retries (exponential backoff)
   */
  RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Creates and configures a QueryClient instance with default cache settings
 *
 * This replaces the Kotlin CacheManager with React Query's built-in caching.
 * The configuration mirrors the TTL and invalidation behavior from the Kotlin implementation.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Time until data is considered stale
        staleTime: CACHE_CONFIG.STALE_TIME,

        // Time until unused cache data is garbage collected
        gcTime: CACHE_CONFIG.GC_TIME,

        // Retry failed queries with exponential backoff
        retry: CACHE_CONFIG.RETRY_COUNT,
        retryDelay: CACHE_CONFIG.RETRY_DELAY,

        // Don't refetch on window focus in embedded JCEF context
        refetchOnWindowFocus: false,

        // Don't refetch on reconnect (IDE manages connectivity)
        refetchOnReconnect: false,

        // Refetch on mount if data is stale
        refetchOnMount: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        retryDelay: 1000,
      },
    },
  });
}

/**
 * Global QueryClient instance
 * Should be provided to QueryClientProvider at the app root
 */
export const queryClient = createQueryClient();

/**
 * Cache invalidation utilities
 * Mirrors CacheManager's invalidate() and invalidateAll() methods
 */
export const cacheUtils = {
  /**
   * Invalidate specific query by key
   * Equivalent to CacheManager.invalidate(key)
   *
   * @param queryKey - The query key to invalidate
   */
  invalidate: (queryKey: unknown[]) => {
    return queryClient.invalidateQueries({ queryKey });
  },

  /**
   * Invalidate all queries
   * Equivalent to CacheManager.invalidateAll()
   */
  invalidateAll: () => {
    return queryClient.invalidateQueries();
  },

  /**
   * Remove specific query from cache
   * More aggressive than invalidate - completely removes the data
   *
   * @param queryKey - The query key to remove
   */
  remove: (queryKey: unknown[]) => {
    return queryClient.removeQueries({ queryKey });
  },

  /**
   * Clear all queries from cache
   * More aggressive than invalidateAll - completely removes all data
   */
  clear: () => {
    return queryClient.clear();
  },

  /**
   * Check if a query exists in cache and is not stale
   * Equivalent to CacheManager.containsKey(key)
   *
   * @param queryKey - The query key to check
   * @returns true if the query exists and has fresh data
   */
  containsKey: (queryKey: unknown[]): boolean => {
    const query = queryClient.getQueryState(queryKey);
    if (!query) {
      return false;
    }

    // Check if data exists and is not stale
    const isStale = query.dataUpdatedAt + CACHE_CONFIG.STALE_TIME < Date.now();
    return query.data !== undefined && !isStale;
  },

  /**
   * Get cached data for a specific query
   * Equivalent to CacheManager.get(key)
   *
   * @param queryKey - The query key to retrieve
   * @returns The cached data or undefined if not found/stale
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  get: <T>(queryKey: unknown[]): T | undefined => {
    const query = queryClient.getQueryState(queryKey);
    if (!query?.data) {
      return undefined;
    }

    // Check if data is expired (stale)
    const isExpired = query.dataUpdatedAt + CACHE_CONFIG.STALE_TIME < Date.now();
    if (isExpired) {
      // Remove expired data (mirrors CacheManager behavior)
      queryClient.removeQueries({ queryKey });
      return undefined;
    }

    return query.data as T;
  },

  /**
   * Manually set cache data for a query
   * Equivalent to CacheManager.put(key, value)
   *
   * @param queryKey - The query key
   * @param data - The data to cache
   */
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  put: <T>(queryKey: unknown[], data: T) => {
    queryClient.setQueryData(queryKey, data);
  },
};
