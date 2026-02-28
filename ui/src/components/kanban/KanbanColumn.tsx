import type { Column, Task } from '@/api/types';
import { KanbanTaskCard } from '@/components/kanban/KanbanTaskCard';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick?: (taskId: number) => void;
}

/** Islands-style Kanban column */
export function KanbanColumn({ column, tasks, onTaskClick }: KanbanColumnProps) {
  return (
    <Stack className="w-72 shrink-0 sm:w-80" spacing="0">
      {/* Column header island */}
      <Stack
        direction="row"
        align="center"
        justify="between"
        spacing="2"
        className="border-border bg-card shadow-island sticky top-0 z-10 mb-3 rounded-lg border px-3 py-2"
      >
        <Text variant="subheading" as="h3" className="truncate">
          {column.name}
        </Text>
        <Badge variant="secondary" size="sm" className="shrink-0">
          {tasks.length}
        </Badge>
      </Stack>

      {/* Task cards */}
      <Stack spacing="2.5" className="flex-1">
        {tasks.length === 0 ? (
          <Stack
            align="center"
            justify="center"
            className="border-border rounded-lg border border-dashed py-8"
          >
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
