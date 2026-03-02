/**
 * Search input + table of child cards for the active release,
 * with an optional branch-status column.
 */

import { type ColumnDef } from '@tanstack/react-table';

import type { Task } from '@/api/types';
import { CardsTable } from '@/components/tasks/CardsTable';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

export interface ReleaseChildCardsProps {
  tasks: Task[];
  totalCount: number | undefined;
  columnMap: Record<number, string>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  activeFilterId: string | undefined;
  extraColumns: ColumnDef<Task>[];
  onRowClick: (id: number) => void;
}

export function ReleaseChildCards({
  tasks,
  totalCount,
  columnMap,
  searchValue,
  onSearchChange,
  isLoading,
  activeFilterId,
  extraColumns,
  onRowClick,
}: ReleaseChildCardsProps) {
  return (
    <>
      <div className="px-3 pb-0.5">
        <Text variant="overline">
          Child cards
          {totalCount !== undefined && (
            <span className="text-muted-foreground ml-1.5 font-normal normal-case">
              ({tasks.length})
            </span>
          )}
        </Text>
      </div>

      <div className="mb-2 px-2">
        <Input
          size="sm"
          placeholder="Search child cards…"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Stack align="center" justify="center" className="py-6">
          <Text variant="secondary">Loading child cards…</Text>
        </Stack>
      ) : (
        <Card variant="island">
          <CardsTable
            key={activeFilterId ?? 'default'}
            tasks={tasks}
            columnMap={columnMap}
            columns={['id', 'title', ...extraColumns, 'responsible', 'members']}
            onRowClick={(id) => onRowClick(id)}
            emptyMessage="No child cards found"
          />
        </Card>
      )}
    </>
  );
}
