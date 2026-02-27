import { cn } from '@/lib/utils';
import { TaskCard } from '@/components/tasks/TaskCard';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useUIStore } from '@/state/uiStore';
import type { Task, Board, Column, Lane } from '@/api/types';

export interface TaskListProps {
  tasks?: Task[];
  isLoading?: boolean;
  error?: Error | null;
  boards?: Board[];
  columnsByBoard?: Record<number, Column[]>;
  /** Render all tasks as a flat list without board/lane/column grouping */
  noGrouping?: boolean;
  className?: string;
  onTaskClick?: (taskId: number) => void;
}

// ---------------------------------------------------------------------------
// Grouping types
// ---------------------------------------------------------------------------

interface ColumnGroup {
  column: Column | null;
  tasks: Task[];
}

interface LaneGroup {
  lane: Lane | null;
  columnGroups: ColumnGroup[];
  totalTasks: number;
}

interface BoardGroup {
  board: Board | null;
  laneGroups: LaneGroup[];
  totalTasks: number;
}

// ---------------------------------------------------------------------------
// Grouping logic: tasks → board → lane → column
// ---------------------------------------------------------------------------

function groupTasks(
  tasks: Task[],
  boards: Board[],
  columnsByBoard: Record<number, Column[]>
): BoardGroup[] {
  const boardMap = new Map<number, Board>(boards.map((b) => [b.id, b]));

  const tasksByBoard = new Map<number | null, Task[]>();
  for (const task of tasks) {
    const bid = task.boardId;
    if (!tasksByBoard.has(bid)) tasksByBoard.set(bid, []);
    tasksByBoard.get(bid)!.push(task);
  }

  const boardGroups: BoardGroup[] = [];

  for (const [boardId, boardTasks] of tasksByBoard) {
    const board = boardId != null ? (boardMap.get(boardId) ?? null) : null;
    const laneMap = new Map<number, Lane>(board?.lanes.map((l) => [l.id, l]) ?? []);
    const columns = boardId != null ? (columnsByBoard[boardId] ?? []) : [];
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

    const tasksByLane = new Map<number | null, Task[]>();
    for (const task of boardTasks) {
      const lid = task.laneId;
      if (!tasksByLane.has(lid)) tasksByLane.set(lid, []);
      tasksByLane.get(lid)!.push(task);
    }

    const laneGroups: LaneGroup[] = [];

    for (const [laneId, laneTasks] of tasksByLane) {
      const lane = laneId != null ? (laneMap.get(laneId) ?? null) : null;
      const columnGroups: ColumnGroup[] = [];

      if (sortedColumns.length > 0) {
        const tasksByColumn = new Map<number, Task[]>();
        for (const col of sortedColumns) tasksByColumn.set(col.id, []);
        const ungrouped: Task[] = [];

        for (const task of laneTasks) {
          const bucket = tasksByColumn.get(task.columnId);
          if (bucket !== undefined) bucket.push(task);
          else ungrouped.push(task);
        }

        for (const col of sortedColumns) {
          const colTasks = tasksByColumn.get(col.id) ?? [];
          if (colTasks.length > 0) columnGroups.push({ column: col, tasks: colTasks });
        }
        if (ungrouped.length > 0) columnGroups.push({ column: null, tasks: ungrouped });
      } else {
        columnGroups.push({ column: null, tasks: laneTasks });
      }

      laneGroups.push({ lane, columnGroups, totalTasks: laneTasks.length });
    }

    boardGroups.push({ board, laneGroups, totalTasks: boardTasks.length });
  }

  return boardGroups;
}

// ---------------------------------------------------------------------------
// Controlled accordion helpers
// ---------------------------------------------------------------------------

/**
 * Given all item IDs and the persisted set of explicitly-closed IDs,
 * returns the list of open item IDs. Items not seen before are open by default.
 */
function computeOpenItems(allIds: string[], closedIds: string[]): string[] {
  const closedSet = new Set(closedIds);
  return allIds.filter((id) => !closedSet.has(id));
}

/**
 * Derive the new closed set when the user changes the open state of a group.
 * `allGroupIds`  — all accordion item IDs that belong to this accordion
 * `newOpenIds`   — the newly open IDs reported by the accordion
 * `prevClosed`   — existing closed IDs from the store
 */
function deriveNewClosed(
  allGroupIds: string[],
  newOpenIds: string[],
  prevClosed: string[]
): string[] {
  const openSet   = new Set(newOpenIds);
  const groupSet  = new Set(allGroupIds);
  // Items in this group that are now closed
  const nowClosed = allGroupIds.filter((id) => !openSet.has(id));
  // Items from other groups in the store stay unchanged
  const otherClosed = prevClosed.filter((id) => !groupSet.has(id));
  return [...otherClosed, ...nowClosed];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskList({
  tasks,
  isLoading = false,
  error = null,
  boards = [],
  columnsByBoard = {},
  noGrouping = false,
  className,
  onTaskClick,
}: TaskListProps) {
  const closedAccordionIds = useUIStore((s) => s.closedAccordionIds);
  const setClosedAccordionIds = useUIStore((s) => s.setClosedAccordionIds);

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
        <Text variant="secondary" className="text-destructive">{error.message}</Text>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Stack align="center" justify="center" className={cn('py-8', className)}>
        <Text variant="secondary">No tasks found</Text>
      </Stack>
    );
  }

  // ── Flat list (no grouping) ──────────────────────────────────────────────
  if (noGrouping) {
    return (
      <div className={cn('py-1', className)}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            columns={[]}
            showColumn
            onClick={() => onTaskClick?.(task.id)}
          />
        ))}
      </div>
    );
  }

  // ── Grouped view ─────────────────────────────────────────────────────────
  const boardGroups = groupTasks(tasks, boards, columnsByBoard);

  // Collect all accordion IDs at board level
  const allBoardIds = boardGroups.map((bg) => `board-${bg.board?.id ?? 'unknown'}`);
  const openBoardIds = computeOpenItems(allBoardIds, closedAccordionIds);

  function handleBoardChange(newOpen: string[]) {
    setClosedAccordionIds(deriveNewClosed(allBoardIds, newOpen, closedAccordionIds));
  }

  return (
    <Accordion
      type="multiple"
      value={openBoardIds}
      onValueChange={handleBoardChange}
      className={cn('m-2', className)}
    >
      {boardGroups.map((bg) => {
        const boardValue = `board-${bg.board?.id ?? 'unknown'}`;
        const boardLabel = bg.board?.name ?? 'Unknown Board';

        // Lane-level accordion IDs for this board
        const allLaneIds = bg.laneGroups.map(
          (lg) => `${boardValue}-lane-${lg.lane?.id ?? 'default'}`
        );
        const openLaneIds = computeOpenItems(allLaneIds, closedAccordionIds);

        function handleLaneChange(newOpen: string[]) {
          setClosedAccordionIds(deriveNewClosed(allLaneIds, newOpen, closedAccordionIds));
        }

        return (
          <AccordionItem key={boardValue} value={boardValue} className="border-none">
            {/* ── Board header ────────────────────────────────────────── */}
            <AccordionTrigger
              className={cn(
                'rounded-lg border border-primary/25 bg-primary/8 px-3 py-2',
                'border-l-[3px] border-l-primary',
                'hover:bg-primary/12 hover:border-primary/40',
                'hover:no-underline transition-all duration-150',
              )}
            >
              <Stack direction="row" spacing="1">
                <Text className="truncate">{boardLabel}</Text>
                <Badge variant="secondary" size="sm" className="shrink-0 mr-1">
                  {bg.totalTasks}
                </Badge>
              </Stack>
            </AccordionTrigger>

            <AccordionContent className="pb-0 pt-0">
              <Accordion
                type="multiple"
                value={openLaneIds}
                onValueChange={handleLaneChange}
              >
                {bg.laneGroups.map((lg) => {
                  const laneValue = `${boardValue}-lane-${lg.lane?.id ?? 'default'}`;
                  const laneLabel = lg.lane?.name ?? 'Lane';

                  // Column-level accordion IDs for this lane
                  const allColIds = lg.columnGroups.map(
                    (cg) => `${laneValue}-col-${cg.column?.id ?? 'ungrouped'}`
                  );
                  const openColIds = computeOpenItems(allColIds, closedAccordionIds);

                  function handleColChange(newOpen: string[]) {
                    setClosedAccordionIds(deriveNewClosed(allColIds, newOpen, closedAccordionIds));
                  }

                  return (
                    <AccordionItem key={laneValue} value={laneValue} className="border-none">
                      {/* ── Lane header ──────────────────────────────── */}
                      <AccordionTrigger
                        className={cn(
                          'ml-1 my-1',
                          'rounded-md border border-indigo-400/20 bg-indigo-500/6 px-3 py-1.5',
                          'border-l-[2px] border-l-indigo-400/70',
                          'hover:bg-indigo-500/10 hover:border-indigo-400/40',
                          'hover:no-underline transition-all duration-150',
                        )}
                      >
                        <Stack direction="row" spacing="1" align="center">
                          <Text className="truncate">{laneLabel}</Text>
                          <Badge
                            variant="outline"
                            size="sm"
                          >
                            {lg.totalTasks}
                          </Badge>
                        </Stack>
                      </AccordionTrigger>

                      <AccordionContent className="pb-0 pt-0">
                        <Accordion
                          type="multiple"
                          value={openColIds}
                          onValueChange={handleColChange}
                        >
                          {lg.columnGroups.map((cg) => {
                            const colValue = `${laneValue}-col-${cg.column?.id ?? 'ungrouped'}`;
                            const colLabel = cg.column?.name ?? 'Other';

                            return (
                              <AccordionItem
                                key={colValue}
                                value={colValue}
                                className="border-none"
                              >
                                {/* ── Column header ──────────────────── */}
                                <AccordionTrigger
                                  className={cn(
                                    'ml-2 my-1',
                                    'rounded border-0 border-l-[2px] border-l-border/60 pl-2 pr-2 py-0.5',
                                    'bg-transparent hover:bg-accent/30',
                                    'hover:no-underline transition-all duration-150',
                                  )}
                                >
                                  <Stack direction="row" spacing="1" align="center">
                                  <Text className="truncate" variant="dimmed">{colLabel}</Text>
                                  <Badge
                                    variant="outline"
                                    size="xs"
                                  >
                                    {cg.tasks.length}
                                  </Badge>
                                  </Stack>
                                </AccordionTrigger>

                                <AccordionContent className="pb-0 pt-0">
                                  <div>
                                    {cg.tasks.map((task) => (
                                      <TaskCard
                                        key={task.id}
                                        task={task}
                                        columns={cg.column ? [cg.column] : []}
                                        showColumn={false}
                                        onClick={() => onTaskClick?.(task.id)}
                                      />
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
