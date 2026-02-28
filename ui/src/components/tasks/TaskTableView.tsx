import { useMemo } from 'react';

import { type ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';

import type { Task, Column } from '@/api/types';
import { CardsTable } from '@/components/tasks/CardsTable';
import { Card } from '@/components/ui/card';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useSettings } from '@/hooks/useSettings';
import { buildKaitenUrl } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/state/filterStore';

export interface TaskTableViewProps {
  tasks?: Task[];
  isLoading?: boolean;
  error?: Error | null;
  columnsByBoard?: Record<number, Column[]>;
  className?: string;
  onTaskClick?: (taskId: number) => void;
}

export function TaskTableView({
  tasks,
  isLoading = false,
  error = null,
  columnsByBoard = {},
  className,
  onTaskClick,
}: TaskTableViewProps) {
  const settings = useSettings();
  const selectedSpaceId = useFilterStore((s) => s.selectedSpaceId);
  const activeFilterId = useFilterStore((s) => s.activeFilterId);

  // Flatten per-board column lists into a single id → name map.
  // Column IDs are unique across boards in Kaiten.
  const columnMap = useMemo(() => {
    const map: Record<number, string> = {};
    Object.values(columnsByBoard).forEach((cols) =>
      cols.forEach((c) => {
        map[c.id] = c.name;
      }),
    );
    return map;
  }, [columnsByBoard]);

  // External link column — inlined as a custom ColumnDef
  const actionsColumn = useMemo<ColumnDef<Task>>(
    () => ({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      header: undefined,
      cell: ({ row }) => {
        const url = buildKaitenUrl(settings.serverUrl, selectedSpaceId, row.original.id);
        if (!url) return null;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary opacity-0 transition-all group-hover/row:opacity-100"
            title="Open in Kaiten"
          >
            <ExternalLink size={11} />
          </a>
        );
      },
      size: 24,
    }),
    [settings.serverUrl, selectedSpaceId],
  );

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Stack align="center" justify="center" className={cn('py-8', className)}>
        <Text variant="secondary">Loading tasks…</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <div className={cn('px-3 py-4', className)}>
        <Text variant="secondary" className="text-destructive">
          {error.message}
        </Text>
      </div>
    );
  }

  return (
    <Card variant="island" className={cn('mt-1', className)}>
      <CardsTable
        key={activeFilterId ?? 'default'}
        tasks={tasks ?? []}
        columnMap={columnMap}
        columns={['id', 'title', 'column', 'responsible', 'members', actionsColumn]}
        onRowClick={onTaskClick}
        emptyMessage="No tasks found"
      />
    </Card>
  );
}
