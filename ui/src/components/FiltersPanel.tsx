import { useSettingsStatus } from '@/hooks/useSettings';
import { useFilterState, useFilterActions } from '@/state/filterStore';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/typography';
import { FiltersPanelBase } from '@/components/filters/FiltersPanelBase';

export function FiltersPanel() {
  const { isConfigured } = useSettingsStatus();
  const { selectedSpaceId, savedFilters, activeFilterId } = useFilterState();
  const { addSavedFilter, updateSavedFilter, deleteSavedFilter, setActiveFilter } = useFilterActions();

  if (!isConfigured) {
    return (
      <Card variant="island" padding="sm">
        <Text variant="dimmed">Configure API settings to enable filters.</Text>
      </Card>
    );
  }

  return (
    <FiltersPanelBase
      savedFilters={savedFilters}
      activeFilterId={activeFilterId}
      spaceId={selectedSpaceId}
      onSetActiveFilter={setActiveFilter}
      onAddFilter={addSavedFilter}
      onUpdateFilter={updateSavedFilter}
      onDeleteFilter={deleteSavedFilter}
    />
  );
}
