import type { Space } from '@/api/types';
import { FilterSection } from '@/components/filters/FilterSection';
import { ComboboxSelect } from '@/components/ui/combobox-select';

export interface SpaceFilterProps {
  spaces: Space[] | undefined;
  isLoading: boolean;
  selectedSpaceId: number | null;
  onSelect: (spaceId: number | null) => void;
}

export function SpaceFilter({ spaces, isLoading, selectedSpaceId, onSelect }: SpaceFilterProps) {
  return (
    <FilterSection title="Space">
      {isLoading ? (
        <p className="text-muted-foreground text-xs">Loading...</p>
      ) : !spaces?.length ? (
        <p className="text-muted-foreground text-xs">No spaces</p>
      ) : (
        <ComboboxSelect
          options={spaces.map((s) => ({ value: String(s.id), label: s.name }))}
          value={selectedSpaceId !== null ? String(selectedSpaceId) : null}
          onChange={(val) => onSelect(val ? Number(val) : null)}
          placeholder="Select space..."
          searchPlaceholder="Search spaces..."
          emptyText="No spaces found."
        />
      )}
    </FilterSection>
  );
}
