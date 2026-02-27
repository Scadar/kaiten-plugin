import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Stack } from '@/components/ui/stack';
import { FilterSection } from '@/components/filters/FilterSection';
import type { Column } from '@/api/types';

export interface ColumnsFilterProps {
  columns: Column[] | undefined;
  isLoading: boolean;
  selectedColumnIds: number[];
  onToggle: (columnId: number) => void;
}

export function ColumnsFilter({ columns, isLoading, selectedColumnIds, onToggle }: ColumnsFilterProps) {
  return (
    <FilterSection title="Columns" defaultOpen={false}>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : !columns?.length ? (
        <p className="text-xs text-muted-foreground">No columns</p>
      ) : (
        <Stack spacing="1">
          {columns.map((col) => (
            <Stack
              key={col.id}
              direction="row"
              align="center"
              spacing="2"
              className="rounded-md px-1.5 py-1 hover:bg-accent/40 cursor-pointer transition-colors"
              onClick={() => onToggle(col.id)}
            >
              <Checkbox
                id={`col-${col.id}`}
                checked={selectedColumnIds.includes(col.id)}
                onCheckedChange={() => onToggle(col.id)}
              />
              <Label
                htmlFor={`col-${col.id}`}
                className="flex-1 text-xs font-normal cursor-pointer truncate"
              >
                {col.name}
              </Label>
            </Stack>
          ))}
        </Stack>
      )}
    </FilterSection>
  );
}
