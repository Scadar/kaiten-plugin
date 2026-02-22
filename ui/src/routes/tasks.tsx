import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useFilteredTasks } from '@/hooks/useFilteredTasks';
import { useColumns } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { TaskList } from '@/components/TaskList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Settings, LayoutList, LayoutGrid } from 'lucide-react';

export const Route = createFileRoute('/tasks')({
  component: TasksComponent,
});

type ViewMode = 'list' | 'kanban';

function TasksComponent() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchText, setSearchText] = useState('');

  const selectedBoardId = useFilterStore((state) => state.selectedBoardId);
  const selectedColumnIds = useFilterStore((state) => state.selectedColumnIds);
  const filterByAssignee = useFilterStore((state) => state.filterByAssignee);
  const filterByParticipant = useFilterStore((state) => state.filterByParticipant);
  const filterLogic = useFilterStore((state) => state.filterLogic);

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useFilteredTasks(
    selectedBoardId,
    { selectedColumnIds, filterByAssignee, filterByParticipant, filterLogic },
    searchText
  );

  const { data: columns, isLoading: columnsLoading } = useColumns(selectedBoardId);

  const isLoading = tasksLoading || columnsLoading;

  return (
    <Layout
      sidebar={<Sidebar />}
      toolbar={<Toolbar searchText={searchText} onSearchChange={setSearchText} viewMode={viewMode} onViewModeChange={setViewMode} />}
    >
      <div className="p-6">
        {!selectedBoardId ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Please select a board from the filters to view tasks</p>
          </div>
        ) : viewMode === 'list' ? (
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            error={tasksError}
            columns={columns}
          />
        ) : (
          <KanbanBoard
            tasks={tasks}
            columns={columns}
            isLoading={isLoading}
            error={tasksError}
          />
        )}
      </div>
    </Layout>
  );
}

interface ToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function Toolbar({ searchText, onSearchChange, viewMode, onViewModeChange }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Button variant="ghost" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button variant="ghost" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>

      <div className="ml-2 flex items-center gap-1 border rounded-md p-1">
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      <div className="ml-4 flex-1">
        <Input
          placeholder="Search tasks by title or ID..."
          className="max-w-md"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">Navigation</h2>
        <Navigation />
      </div>
      <FiltersPanel />
    </div>
  );
}
