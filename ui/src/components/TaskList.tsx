import type { Task, Board, Column } from '@/api/types';
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
import { computeOpenItems, deriveNewClosed } from '@/hooks/useAccordionState';
import { groupTasks } from '@/lib/taskGrouping';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/state/uiStore';

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
        <Text variant="secondary" className="text-destructive">
          {error.message}
        </Text>
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
          (lg) => `${boardValue}-lane-${lg.lane?.id ?? 'default'}`,
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
                'border-primary/25 bg-primary/8 rounded-lg border px-3 py-2',
                'border-l-primary border-l-[3px]',
                'hover:bg-primary/12 hover:border-primary/40',
                'transition-all duration-150 hover:no-underline',
              )}
            >
              <Stack direction="row" spacing="1">
                <Text className="truncate">{boardLabel}</Text>
                <Badge variant="secondary" size="sm" className="mr-1 shrink-0">
                  {bg.totalTasks}
                </Badge>
              </Stack>
            </AccordionTrigger>

            <AccordionContent className="pt-0 pb-0">
              <Accordion type="multiple" value={openLaneIds} onValueChange={handleLaneChange}>
                {bg.laneGroups.map((lg) => {
                  const laneValue = `${boardValue}-lane-${lg.lane?.id ?? 'default'}`;
                  const laneLabel = lg.lane?.name ?? 'Lane';

                  // Column-level accordion IDs for this lane
                  const allColIds = lg.columnGroups.map(
                    (cg) => `${laneValue}-col-${cg.column?.id ?? 'ungrouped'}`,
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
                          'my-1 ml-1',
                          'rounded-md border border-indigo-400/20 bg-indigo-500/6 px-3 py-1.5',
                          'border-l-[2px] border-l-indigo-400/70',
                          'hover:border-indigo-400/40 hover:bg-indigo-500/10',
                          'transition-all duration-150 hover:no-underline',
                        )}
                      >
                        <Stack direction="row" spacing="1" align="center">
                          <Text className="truncate">{laneLabel}</Text>
                          <Badge variant="outline" size="sm">
                            {lg.totalTasks}
                          </Badge>
                        </Stack>
                      </AccordionTrigger>

                      <AccordionContent className="pt-0 pb-0">
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
                                    'my-1 ml-2',
                                    'border-l-border/60 rounded border-0 border-l-[2px] py-0.5 pr-2 pl-2',
                                    'hover:bg-accent/30 bg-transparent',
                                    'transition-all duration-150 hover:no-underline',
                                  )}
                                >
                                  <Stack direction="row" spacing="1" align="center">
                                    <Text className="truncate" variant="dimmed">
                                      {colLabel}
                                    </Text>
                                    <Badge variant="outline" size="xs">
                                      {cg.tasks.length}
                                    </Badge>
                                  </Stack>
                                </AccordionTrigger>

                                <AccordionContent className="pt-0 pb-0">
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
