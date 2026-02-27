import { ComboboxSelect } from '@/components/ui/combobox-select';
import { FilterSection } from '@/components/filters/FilterSection';
import type { Board } from '@/api/types';

export interface BoardFilterProps {
  boards: Board[] | undefined;
  isLoading: boolean;
  selectedBoardId: number | null;
  onSelect: (boardId: number | null) => void;
}

export function BoardFilter({ boards, isLoading, selectedBoardId, onSelect }: BoardFilterProps) {
  return (
    <FilterSection title="Board">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : !boards?.length ? (
        <p className="text-xs text-muted-foreground">No boards</p>
      ) : (
        <ComboboxSelect
          options={boards.map((b) => ({ value: String(b.id), label: b.name }))}
          value={selectedBoardId !== null ? String(selectedBoardId) : null}
          onChange={(val) => onSelect(val ? Number(val) : null)}
          placeholder="Select board..."
          searchPlaceholder="Search boards..."
          emptyText="No boards found."
        />
      )}
    </FilterSection>
  );
}
