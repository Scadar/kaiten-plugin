import { FiltersPanelBase } from '@/components/filters/FiltersPanelBase';
import { useReleaseFilterState, useReleaseFilterActions } from '@/state/releaseFilterStore';

interface ReleasesFiltersPanelProps {
  spaceId: number | null;
}

export function ReleasesFiltersPanel({ spaceId }: ReleasesFiltersPanelProps) {
  const { savedFilters, activeFilterId } = useReleaseFilterState();
  const { addSavedFilter, updateSavedFilter, deleteSavedFilter, setActiveFilter } =
    useReleaseFilterActions();

  return (
    <FiltersPanelBase
      savedFilters={savedFilters}
      activeFilterId={activeFilterId}
      spaceId={spaceId}
      onSetActiveFilter={setActiveFilter}
      onAddFilter={addSavedFilter}
      onUpdateFilter={updateSavedFilter}
      onDeleteFilter={deleteSavedFilter}
      className="mt-2"
    />
  );
}
