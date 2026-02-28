import type { ReactNode } from 'react';

import { RefreshCw, LayoutList, LayoutGrid, Table2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'list' | 'kanban';

export interface TasksToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  noGrouping?: boolean;
  onNoGroupingChange?: (value: boolean) => void;
}

const VIEW_MODES: { mode: ViewMode; icon: ReactNode; label: string }[] = [
  { mode: 'table', icon: <Table2 size={13} />, label: 'Table view' },
  { mode: 'list', icon: <LayoutList size={13} />, label: 'List view' },
  { mode: 'kanban', icon: <LayoutGrid size={13} />, label: 'Kanban view' },
];

export function TasksToolbar({
  viewMode,
  onViewModeChange,
  onRefresh,
  noGrouping = false,
  onNoGroupingChange,
}: TasksToolbarProps) {
  return (
    <>
      {/* Title + count */}
      <Text variant="body" className="flex-1">
        Tasks
      </Text>

      {/* Flat list toggle — only visible in list view */}
      {viewMode === 'list' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className={cn(
                'px-2 text-xs',
                noGrouping
                  ? 'bg-primary/[0.12] text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              )}
              onClick={() => onNoGroupingChange?.(!noGrouping)}
            >
              Flat list
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Show as flat list without grouping</TooltipContent>
        </Tooltip>
      )}

      {/* View mode button group */}
      <Stack
        direction="row"
        align="center"
        className="border-border/70 overflow-hidden rounded-md border"
      >
        {VIEW_MODES.map(({ mode, icon, label }, idx) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  'rounded-none border-0',
                  idx < VIEW_MODES.length - 1 && 'border-border/70 border-r',
                  viewMode === mode
                    ? 'bg-primary/[0.12] text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
                onClick={() => onViewModeChange(mode)}
              >
                {icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
          </Tooltip>
        ))}
      </Stack>

      {/* Refresh */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onRefresh}>
            <RefreshCw />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh</TooltipContent>
      </Tooltip>
    </>
  );
}
