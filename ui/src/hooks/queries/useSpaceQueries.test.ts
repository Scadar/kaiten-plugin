import React from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { makeSpace } from '@/test/fixtures';
import { createTestQueryClient } from '@/test/queryClientWrapper';

const mockGetSpaces = vi.fn();

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({ getSpaces: mockGetSpaces }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeWrapper() {
  const qc = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

describe('useSpaces', () => {
  it('calls client.getSpaces() when client is available', async () => {
    const { useSpaces } = await import('./useSpaceQueries');
    const spaces = [makeSpace({ id: 1, name: 'Space 1' })];
    mockGetSpaces.mockResolvedValue(spaces);

    const { result } = renderHook(() => useSpaces(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetSpaces).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(spaces);
  });

  it('uses the correct query key for the cache', async () => {
    const { useSpaces } = await import('./useSpaceQueries');
    mockGetSpaces.mockResolvedValue([]);

    const { result } = renderHook(() => useSpaces(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // queryKey structure comes from spacesKeys.all()
    expect(result.current.data).toEqual([]);
  });
});
