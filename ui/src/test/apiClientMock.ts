import { vi, type Mocked } from 'vitest';

import type { KaitenApiClient } from '@/api/client';

/**
 * Creates a mock KaitenApiClient where every method is a vi.fn().
 * Cast as the real type so callers get full type-checking.
 *
 * Usage:
 *   const mockClient = createMockApiClient();
 *   mockClient.getSpaces.mockResolvedValue([...]);
 */
export function createMockApiClient(): Mocked<KaitenApiClient> {
  return {
    getSpaces: vi.fn(),
    getBoards: vi.fn(),
    getColumns: vi.fn(),
    getCards: vi.fn(),
    getCardsBySpace: vi.fn(),
    getCard: vi.fn(),
    getCardDetail: vi.fn(),
    getCardsByFilter: vi.fn(),
    getCardComments: vi.fn(),
    getCardFiles: vi.fn(),
    getUsers: vi.fn(),
    getCurrentUser: vi.fn(),
    getTags: vi.fn(),
    getCardTypes: vi.fn(),
    getCustomProperties: vi.fn(),
    getCustomProperty: vi.fn(),
    getCustomPropertySelectValues: vi.fn(),
  } as unknown as Mocked<KaitenApiClient>;
}
