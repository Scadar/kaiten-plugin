import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { useUIStore } from '@/state/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { useFilteredTasks } from '@/hooks/useFilteredTasks';
import { useBoards, useColumnsByBoards } from '@/hooks/useKaitenQuery';
import { tasksKeys } from '@/api/endpoints';
import { useFilterState, useActiveFilter } from '@/state/filterStore';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/typography';
import { FiltersPanel } from '@/components/FiltersPanel';
import { TaskList } from '@/components/TaskList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskTableView } from '@/components/tasks/TaskTableView';
import { TasksToolbar } from '@/components/tasks/TasksToolbar';

export const Route = createFileRoute('/tasks')({
  component: TasksComponent,
});

function TasksComponent() {
  const viewMode             = useUIStore((s) => s.tasksViewMode);
  const setViewMode          = useUIStore((s) => s.setTasksViewMode);
  const noGrouping           = useUIStore((s) => s.tasksListNoGrouping);
  const setNoGrouping        = useUIStore((s) => s.setTasksListNoGrouping);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleTaskClick = useCallback(
    (taskId: number) => navigate({ to: '/card/$cardId', params: { cardId: String(taskId) } }),
    [navigate],
  );

  const { selectedSpaceId } = useFilterState();
  const activeFilter        = useActiveFilter();

  const boardIdForKanban = activeFilter?.boardId ?? null;

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useFilteredTasks(
    selectedSpaceId,
    activeFilter,
  );

  const { data: boards, isLoading: boardsLoading } = useBoards(selectedSpaceId);

  const taskBoardIds = useMemo(() => {
    if (!tasks) return [];
    return [...new Set(
      tasks.map((t) => t.boardId).filter((id): id is number => id != null)
    )];
  }, [tasks]);

  const { data: columnsByBoard, isLoading: columnsLoading } = useColumnsByBoards(taskBoardIds);

  // Apply client-side column filter from the active filter's columnIds
  const filteredTasks = useMemo(() => {
    if (!tasks) return tasks;
    const ids = activeFilter?.columnIds;
    if (!ids || ids.length === 0) return tasks;
    return tasks.filter((t) => ids.includes(t.columnId));
  }, [tasks, activeFilter]);

  const isLoading = tasksLoading || boardsLoading || columnsLoading;

  const handleRefresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: tasksKeys.all() }),
    [queryClient]
  );

  const canUseKanban = boardIdForKanban !== null;
  const kanbanColumns = boardIdForKanban != null ? (columnsByBoard[boardIdForKanban] ?? []) : [];
  const kanbanLanes = useMemo(
    () => boards?.find((b) => b.id === boardIdForKanban)?.lanes ?? [],
    [boards, boardIdForKanban]
  );

  return (
    <Layout
      header={
        <TasksToolbar
          taskCount={filteredTasks?.length}
          viewMode={viewMode}
          onViewModeChange={canUseKanban ? setViewMode : (mode) => setViewMode(mode === 'kanban' ? 'table' : mode)}
          onRefresh={handleRefresh}
          noGrouping={noGrouping}
          onNoGroupingChange={setNoGrouping}
        />
      }
    >
      {/* Filters */}
      <FiltersPanel />

      {/* Content */}
      {!selectedSpaceId ? (
        <Card variant="island" padding="md" className="my-3 text-center">
          <Text variant="dimmed">
            Configure a space in{' '}
            <Link to="/settings" className="underline text-primary">
              Settings
            </Link>{' '}
            to view tasks
          </Text>
        </Card>
      ) : viewMode === 'kanban' && canUseKanban ? (
        <div className="overflow-x-auto">
          <KanbanBoard
            tasks={filteredTasks}
            columns={kanbanColumns}
            lanes={kanbanLanes}
            isLoading={isLoading}
            error={tasksError}
            className="p-3"
            onTaskClick={handleTaskClick}
          />
        </div>
      ) : viewMode === 'kanban' && !canUseKanban ? (
        <Card variant="island" padding="md" className="my-3 text-center">
          <Text variant="dimmed">Select a board in the filter settings to enable Kanban view</Text>
        </Card>
      ) : viewMode === 'table' ? (
        <TaskTableView
          tasks={filteredTasks}
          isLoading={isLoading}
          error={tasksError}
          columnsByBoard={columnsByBoard}
          onTaskClick={handleTaskClick}
        />
      ) : (
        <TaskList
          tasks={filteredTasks}
          isLoading={isLoading}
          error={tasksError}
          boards={boards}
          columnsByBoard={columnsByBoard}
          noGrouping={noGrouping}
          onTaskClick={handleTaskClick}
        />
      )}
    </Layout>
  );
}
