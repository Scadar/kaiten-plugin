import { useMemo } from 'react';

import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';

import { customPropertiesKeys } from '@/api/endpoints';
import type { CustomProperty, CustomPropertySelectValue } from '@/api/types';

import { useApiClient } from '../useApiClient';

export function useCustomProperties(): UseQueryResult<CustomProperty[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: customPropertiesKeys.all(),
    queryFn: () => client!.getCustomProperties(),
    enabled: client !== null,
  });
}

export interface CustomPropertyWithValues extends CustomProperty {
  selectValues: CustomPropertySelectValue[];
}

export function useCustomPropertiesWithValues(): {
  data: CustomPropertyWithValues[];
  isLoading: boolean;
} {
  const client = useApiClient();
  const { data: properties = [], isLoading: propsLoading } = useCustomProperties();

  const selectProperties = useMemo(
    () => properties.filter((p) => p.type === 'select'),
    [properties],
  );

  const selectValueResults = useQueries({
    queries: selectProperties.map((p) => ({
      queryKey: customPropertiesKeys.selectValues(p.id),
      queryFn: () => client!.getCustomPropertySelectValues(p.id),
      enabled: client !== null,
    })),
  });

  const data = useMemo<CustomPropertyWithValues[]>(() => {
    return properties.map((prop) => {
      if (prop.type !== 'select') return { ...prop, selectValues: [] };
      const idx = selectProperties.findIndex((sp) => sp.id === prop.id);
      const values = idx >= 0 ? (selectValueResults[idx]?.data ?? []) : [];
      return { ...prop, selectValues: values };
    });
  }, [properties, selectProperties, selectValueResults]);

  return {
    data,
    isLoading: propsLoading || selectValueResults.some((r) => r.isLoading),
  };
}

export interface ResolvedCustomProperty {
  property: CustomProperty;
  selectedValueIds: number[];
  selectValues: CustomPropertySelectValue[] | null;
}

export function useCardCustomProperties(properties: Record<string, number[]>): {
  data: ResolvedCustomProperty[];
  isLoading: boolean;
} {
  const client = useApiClient();

  const propertyEntries = useMemo(() => {
    return Object.entries(properties)
      .map(([key, valueIds]) => {
        const match = /^id_(\d+)$/.exec(key);
        if (!match) return null;
        const normalized = Array.isArray(valueIds) ? valueIds : [Number(valueIds)];
        return { id: parseInt(match[1]!, 10), valueIds: normalized };
      })
      .filter((e): e is { id: number; valueIds: number[] } => e !== null);
  }, [properties]);

  const propertyIds = useMemo(() => propertyEntries.map((e) => e.id), [propertyEntries]);

  const propResults = useQueries({
    queries: propertyIds.map((id) => ({
      queryKey: customPropertiesKeys.detail(id),
      queryFn: () => client!.getCustomProperty(id),
      enabled: client !== null,
    })),
  });

  const selectResults = useQueries({
    queries: propertyIds.map((id, i) => ({
      queryKey: customPropertiesKeys.selectValues(id),
      queryFn: () => client!.getCustomPropertySelectValues(id),
      enabled: client !== null && propResults[i]?.data?.type === 'select',
    })),
  });

  const data = useMemo<ResolvedCustomProperty[]>(() => {
    return propertyEntries
      .map(({ valueIds }, i) => {
        const prop = propResults[i]?.data;
        if (!prop) return null;
        const selectValues = prop.type === 'select' ? (selectResults[i]?.data ?? null) : null;
        return { property: prop, selectedValueIds: valueIds, selectValues };
      })
      .filter((e): e is ResolvedCustomProperty => e !== null);
  }, [propertyEntries, propResults, selectResults]);

  return {
    data,
    isLoading: propResults.some((q) => q.isLoading),
  };
}
