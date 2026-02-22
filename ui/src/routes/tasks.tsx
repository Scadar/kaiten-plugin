import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFilteredTasks } from '@/hooks/useFilteredTasks';
import { useColumns } from '@/hooks/useKaitenQuery';
import { tasksKeys } from '@/api/endpoints';
import { useFilterStore } from '@/state/filterStore';
import { Layout } from '@/components/Layout';
import { FiltersPanel } from '@/components/FiltersPanel';
import { TaskList } from '@/components/TaskList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, LayoutList, LayoutGrid, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/tasks')({
  component: TasksComponent,
});

type ViewMode = 'list' | 'kanban';

function TasksComponent() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const queryClient = useQueryClient();

  const selectedBoardId = useFilterStore((s) => s.selectedBoardId);
  const selectedColumnIds = useFilterStore((s) => s.selectedColumnIds);
  const filterByAssignee = useFilterStore((s) => s.filterByAssignee);
  const filterByParticipant = useFilterStore((s) => s.filterByParticipant);
  const filterLogic = useFilterStore((s) => s.filterLogic);

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useFilteredTasks(
    selectedBoardId,
    { selectedColumnIds, filterByAssignee, filterByParticipant, filterLogic },
    searchText
  );

  const { data: columns, isLoading: columnsLoading } = useColumns(selectedBoardId);
  const isLoading = tasksLoading || columnsLoading;

  return (
    <Layout
      header={
        <>
          <span className="flex-1 text-xs font-medium text-muted-foreground">Tasks</span>
          {tasks && (
            <span className="text-[11px] text-muted-foreground">{tasks.length}</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowSearch((v) => !v)}
              >
                <Search size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', viewMode === 'list' && 'text-primary')}
                onClick={() => setViewMode('list')}
              >
                <LayoutList size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', viewMode === 'kanban' && 'text-primary')}
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Kanban view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => queryClient.invalidateQueries({ queryKey: tasksKeys.all() })}
              >
                <RefreshCw size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
        </>
      }
    >
      {/* Filters */}
      <FiltersPanel />

      {/* Search */}
      {showSearch && (
        <div className="border-b border-border px-2 py-1.5">
          <Input
            autoFocus
            placeholder="Search tasks..."
            className="h-7 text-xs"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {!selectedBoardId ? (
        <div className="flex items-center justify-center py-8 px-3">
          <p className="text-center text-xs text-muted-foreground">
            Select a space and board in Filters to view tasks
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <TaskList
          tasks={tasks}
          isLoading={isLoading}
          error={tasksError}
          columns={columns}
        />
      ) : (
        <div className="overflow-x-auto">
          <KanbanBoard
            tasks={tasks}
            columns={columns}
            isLoading={isLoading}
            error={tasksError}
            className="p-3"
          />
        </div>
      )}
    </Layout>
  );
}
