import * as React from 'react';
import { cn } from '@/lib/utils';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { KanbanTaskCard } from '@/components/kanban/KanbanTaskCard';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import type { Task, Column, Lane } from '@/api/types';

export interface KanbanBoardProps {
  tasks?: Task[];
  columns?: Column[];
  lanes?: Lane[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  onTaskClick?: (taskId: number) => void;
}

interface LaneRow {
  id: number | null;
  label: string;
}

export const KanbanBoard = React.forwardRef<HTMLDivElement, KanbanBoardProps>(
  ({ tasks, columns = [], lanes = [], isLoading = false, error = null, className, onTaskClick }, ref) => {
    const sortedColumns = React.useMemo(
      () => [...columns].sort((a, b) => a.position - b.position),
      [columns]
    );

    // Group tasks by laneId → columnId
    const tasksByLaneAndColumn = React.useMemo(() => {
      const result = new Map<number | null, Map<number, Task[]>>();
      for (const task of tasks ?? []) {
        const laneId = task.laneId;
        if (!result.has(laneId)) result.set(laneId, new Map());
        const laneMap = result.get(laneId)!;
        if (!laneMap.has(task.columnId)) laneMap.set(task.columnId, []);
        laneMap.get(task.columnId)!.push(task);
      }
      return result;
    }, [tasks]);

    // Simple column map for the no-lanes layout
    const tasksByColumn = React.useMemo(() => {
      const grouped = new Map<number, Task[]>();
      columns.forEach((col) => grouped.set(col.id, []));
      tasks?.forEach((task) => {
        const col = grouped.get(task.columnId);
        if (col) col.push(task);
      });
      return grouped;
    }, [tasks, columns]);

    // Ordered lane rows: board lanes first, then any unknown lane IDs that
    // have tasks (e.g. from a different board), then a "No lane" row if needed.
    const laneRows = React.useMemo((): LaneRow[] => {
      const rows: LaneRow[] = lanes.map((l) => ({ id: l.id, label: l.name }));
      const knownIds = new Set(lanes.map((l) => l.id));

      for (const laneId of tasksByLaneAndColumn.keys()) {
        if (laneId !== null && !knownIds.has(laneId)) {
          const hasTasks = [...(tasksByLaneAndColumn.get(laneId)?.values() ?? [])].some(
            (ts) => ts.length > 0
          );
          if (hasTasks) rows.push({ id: laneId, label: `Lane ${laneId}` });
        }
      }

      const nullMap = tasksByLaneAndColumn.get(null);
      if (nullMap && [...nullMap.values()].some((ts) => ts.length > 0)) {
        rows.push({ id: null, label: 'No lane' });
      }

      return rows;
    }, [lanes, tasksByLaneAndColumn]);

    if (isLoading) {
      return (
        <Stack ref={ref} align="center" justify="center" className={cn('p-8', className)}>
          <Text variant="secondary">Loading kanban board...</Text>
        </Stack>
      );
    }

    if (error) {
      return (
        <Stack ref={ref} align="center" justify="center" className={cn('p-8', className)}>
          <Text variant="secondary" className="text-destructive">Error: {error.message}</Text>
        </Stack>
      );
    }

    if (columns.length === 0) {
      return (
        <Stack ref={ref} align="center" justify="center" className={cn('p-8', className)}>
          <Text variant="secondary">No columns available</Text>
        </Stack>
      );
    }

    // -----------------------------------------------------------------------
    // No lanes — original columns-only layout
    // -----------------------------------------------------------------------
    if (lanes.length === 0) {
      return (
        <Stack ref={ref} direction="row" spacing="3" className={cn('overflow-x-auto pb-4', className)}>
          {sortedColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              onTaskClick={onTaskClick}
            />
          ))}
        </Stack>
      );
    }

    // -----------------------------------------------------------------------
    // Swimlane layout: lanes × columns grid
    // -----------------------------------------------------------------------
    return (
      <div ref={ref} className={cn('overflow-x-auto pb-4', className)}>
        <div
          className="grid gap-3 min-w-max"
          style={{ gridTemplateColumns: `160px repeat(${sortedColumns.length}, 288px)` }}
        >
          {/* ── Header row: corner spacer + column headers ── */}
          <div /> {/* corner */}
          {sortedColumns.map((col) => {
            const total = (tasks ?? []).filter((t) => t.columnId === col.id).length;
            return (
              <Stack
                key={col.id}
                direction="row"
                align="center"
                justify="between"
                spacing="2"
                className="rounded-lg border border-border bg-card px-3 py-2 shadow-island"
              >
                <Text variant="subheading" as="h3" className="truncate">{col.name}</Text>
                <Badge variant="secondary" size="sm" className="shrink-0">
                  {total}
                </Badge>
              </Stack>
            );
          })}

          {/* ── Lane rows ── */}
          {laneRows.map((row) => {
            const colMap = tasksByLaneAndColumn.get(row.id) ?? new Map<number, Task[]>();
            const laneTotal = [...colMap.values()].reduce((s, ts) => s + ts.length, 0);

            return (
              <React.Fragment key={`lane-${row.id ?? 'null'}`}>
                {/* Lane header */}
                <Stack
                  justify="between"
                  spacing="1.5"
                  className="rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <Text variant="body" className="break-words">
                    {row.label}
                  </Text>
                  <Badge variant="outline" size="sm" className="w-fit">
                    {laneTotal}
                  </Badge>
                </Stack>

                {/* Column cells */}
                {sortedColumns.map((col) => {
                  const colTasks = colMap.get(col.id) ?? [];
                  return (
                    <Stack
                      key={col.id}
                      spacing="2"
                      className="rounded-lg border border-border/50 bg-muted/20 p-2 min-h-[56px]"
                    >
                      {colTasks.map((task) => (
                        <KanbanTaskCard
                          key={task.id}
                          task={task}
                          onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
                        />
                      ))}
                    </Stack>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);

KanbanBoard.displayName = 'KanbanBoard';
