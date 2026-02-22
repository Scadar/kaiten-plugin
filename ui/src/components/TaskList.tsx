import { cn } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { Task, Column } from "@/api/types"

export interface TaskListProps {
  tasks?: Task[]
  isLoading?: boolean
  error?: Error | null
  columns?: Column[]
  className?: string
  onTaskClick?: (taskId: number) => void
}

export function TaskList({
  tasks,
  isLoading = false,
  error = null,
  columns = [],
  className,
  onTaskClick,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <p className="text-xs text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("px-3 py-4", className)}>
        <p className="text-xs text-destructive">{error.message}</p>
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <p className="text-xs text-muted-foreground">No tasks found</p>
      </div>
    )
  }

  const getColumnName = (columnId: number) =>
    columns.find((c) => c.id === columnId)?.name ?? `#${columnId}`

  const getAssigneeName = (task: Task) => {
    if (!task.assigneeId) return null
    const m = task.participants.find((p) => p.id === task.assigneeId)
    return m?.fullName ?? `User ${task.assigneeId}`
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {tasks.map((task) => {
        const assignee = getAssigneeName(task)
        const column = getColumnName(task.columnId)

        return (
          <div
            key={task.id}
            className="flex items-start gap-2 px-3 py-2 hover:bg-accent/30 cursor-pointer transition-colors"
            onClick={() => onTaskClick?.(task.id)}
          >
            {/* Task ID */}
            <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
              #{task.id}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] leading-snug">{task.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge
                  variant="secondary"
                  className="h-4 rounded-sm px-1 py-0 text-[10px] font-normal"
                >
                  {column}
                </Badge>
                {assignee && <span className="truncate">{assignee}</span>}
                {task.dueDate && (
                  <span className="shrink-0">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
