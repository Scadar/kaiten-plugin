/**
 * TaskList component for displaying filtered Kaiten tasks in a list view
 *
 * Features:
 * - Displays tasks with ID, title, assignee, and column information
 * - Handles loading states with user-friendly messages
 * - Handles empty states when no tasks are found
 * - Handles error states with error messages
 * - Uses Card and Badge components from shadcn UI for consistent styling
 *
 * Example usage:
 *   <TaskList
 *     tasks={filteredTasks}
 *     isLoading={isLoading}
 *     error={error}
 *     columns={columns}
 *   />
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import { Task, Column } from "@/api/types"

/**
 * Props for TaskList component
 */
export interface TaskListProps {
  /** Array of tasks to display (undefined while loading) */
  tasks?: Task[]
  /** Loading state indicator */
  isLoading?: boolean
  /** Error from data fetching */
  error?: Error | null
  /** Columns data for displaying column names (optional) */
  columns?: Column[]
  /** Additional CSS classes */
  className?: string
}

/**
 * TaskList component displays a list of Kaiten tasks
 *
 * Renders tasks in a card-based list layout with:
 * - Task ID badge
 * - Task title
 * - Assignee information (if available)
 * - Column name badge (if columns provided)
 * - Participant count (if participants exist)
 *
 * @param props - TaskList component props
 * @returns Rendered task list or loading/error/empty state
 */
export function TaskList({
  tasks,
  isLoading = false,
  error = null,
  columns = [],
  className,
}: TaskListProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-destructive">Error loading tasks: {error.message}</p>
      </div>
    )
  }

  // Handle empty state
  if (!tasks || tasks.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">No tasks found</p>
      </div>
    )
  }

  // Helper function to get column name by ID
  const getColumnName = (columnId: number): string => {
    const column = columns.find((col) => col.id === columnId)
    return column?.name ?? `Column ${columnId}`
  }

  // Helper function to format assignee name
  const getAssigneeName = (task: Task): string | null => {
    // If there's an assigneeId but we don't have member details, show ID
    if (task.assigneeId) {
      // Check if assignee is in participants
      const assignee = task.participants.find(
        (member) => member.id === task.assigneeId
      )
      return assignee?.fullName ?? `User ${task.assigneeId}`
    }
    return null
  }

  // Helper function to get participant count
  const getParticipantCount = (task: Task): number => {
    return task.participants.length
  }

  return (
    <div className={cn("space-y-4", className)}>
      {tasks.map((task) => {
        const assigneeName = getAssigneeName(task)
        const columnName = getColumnName(task.columnId)
        const participantCount = getParticipantCount(task)

        return (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">#{task.id}</Badge>
                    <Badge variant="secondary">{columnName}</Badge>
                  </div>
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  {task.description && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {task.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {assigneeName && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Assignee:</span>
                    <span>{assigneeName}</span>
                  </div>
                )}
                {participantCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Participants:</span>
                    <span>{participantCount}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Due:</span>
                    <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
