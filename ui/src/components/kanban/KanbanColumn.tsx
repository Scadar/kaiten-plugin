import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { KanbanTaskCard } from '@/components/kanban/KanbanTaskCard';
import type { Column, Task } from '@/api/types';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick?: (taskId: number) => void;
}

/** Islands-style Kanban column */
export function KanbanColumn({ column, tasks, onTaskClick }: KanbanColumnProps) {
  return (
    <Stack className="w-72 sm:w-80 shrink-0" spacing="0">
      {/* Column header island */}
      <Stack
        direction="row"
        align="center"
        justify="between"
        spacing="2"
        className="mb-3 sticky top-0 z-10 rounded-lg border border-border bg-card px-3 py-2 shadow-island"
      >
        <Text variant="subheading" as="h3" className="truncate">{column.name}</Text>
        <Badge variant="secondary" size="sm" className="shrink-0">{tasks.length}</Badge>
      </Stack>

      {/* Task cards */}
      <Stack spacing="2.5" className="flex-1">
        {tasks.length === 0 ? (
          <Stack align="center" justify="center" className="py-8 rounded-lg border border-dashed border-border">
            <Text variant="secondary">No tasks</Text>
          </Stack>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            />
          ))
        )}
      </Stack>
    </Stack>
  );
}
