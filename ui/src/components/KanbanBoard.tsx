/**
 * KanbanBoard component for displaying Kaiten tasks in a kanban view
 *
 * Features:
 * - Groups tasks by columns in a horizontal board layout
 * - Displays task cards with ID, title, assignee information
 * - Handles loading states with user-friendly messages
 * - Handles empty states when no tasks are found
 * - Handles error states with error messages
 * - Uses Card and Badge components from shadcn UI for consistent styling
 *
 * Example usage:
 *   <KanbanBoard
 *     tasks={filteredTasks}
 *     columns={columns}
 *     isLoading={isLoading}
 *     error={error}
 *   />
 */

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import { Task, Column } from "@/api/types"

/**
 * Props for KanbanBoard component
 */
export interface KanbanBoardProps {
  /** Array of tasks to display (undefined while loading) */
  tasks?: Task[]
  /** Array of columns to organize tasks by */
  columns?: Column[]
  /** Loading state indicator */
  isLoading?: boolean
  /** Error from data fetching */
  error?: Error | null
  /** Additional CSS classes */
  className?: string
}

/**
 * KanbanBoard component displays tasks grouped by columns in a kanban layout
 *
 * Renders a horizontal board with columns containing task cards:
 * - Column headers with column names
 * - Task cards showing ID, title, assignee, and participants
 * - Responsive horizontal scrolling for many columns
 *
 * @param props - KanbanBoard component props
 * @returns Rendered kanban board or loading/error/empty state
 */
export const KanbanBoard = React.forwardRef<
  HTMLDivElement,
  KanbanBoardProps
>(({ tasks, columns = [], isLoading = false, error = null, className }, ref) => {
  // Handle loading state
  if (isLoading) {
    return (
      <div ref={ref} className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">Loading kanban board...</p>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div ref={ref} className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-destructive">Error loading kanban board: {error.message}</p>
      </div>
    )
  }

  // Handle empty columns state
  if (!columns || columns.length === 0) {
    return (
      <div ref={ref} className={cn("flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">No columns available</p>
      </div>
    )
  }

  // Group tasks by column ID
  const tasksByColumn = React.useMemo(() => {
    const grouped = new Map<number, Task[]>()

    // Initialize all columns with empty arrays
    columns.forEach((column) => {
      grouped.set(column.id, [])
    })

    // Group tasks by their column ID
    if (tasks) {
      tasks.forEach((task) => {
        const columnTasks = grouped.get(task.columnId)
        if (columnTasks) {
          columnTasks.push(task)
        }
      })
    }

    return grouped
  }, [tasks, columns])

  // Helper function to format assignee name
  const getAssigneeName = (task: Task): string | null => {
    if (task.assigneeId) {
      // Check if assignee is in participants
      const assignee = task.participants.find(
        (member) => member.id === task.assigneeId
      )
      return assignee?.fullName ?? `User ${task.assigneeId}`
    }
    return null
  }

  // Sort columns by position
  const sortedColumns = React.useMemo(() => {
    return [...columns].sort((a, b) => a.position - b.position)
  }, [columns])

  return (
    <div
      ref={ref}
      className={cn("flex gap-4 overflow-x-auto pb-4", className)}
    >
      {sortedColumns.map((column) => {
        const columnTasks = tasksByColumn.get(column.id) || []

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 flex flex-col"
          >
            {/* Column Header */}
            <div className="mb-4 sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/50">
                <h3 className="font-semibold text-sm">{column.name}</h3>
                <Badge variant="secondary">{columnTasks.length}</Badge>
              </div>
            </div>

            {/* Column Tasks */}
            <div className="space-y-3 flex-1">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center p-8 border rounded-lg border-dashed">
                  <p className="text-xs text-muted-foreground">No tasks</p>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const assigneeName = getAssigneeName(task)
                  const participantCount = task.participants.length

                  return (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            #{task.id}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm leading-snug">
                          {task.title}
                        </CardTitle>
                        {task.description && (
                          <CardDescription className="text-xs line-clamp-2 mt-1">
                            {task.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {assigneeName && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Assignee:</span>
                              <span className="truncate">{assigneeName}</span>
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
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})

KanbanBoard.displayName = "KanbanBoard"
