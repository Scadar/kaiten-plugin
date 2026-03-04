import * as React from 'react';

import { ExternalLink, GitBranch } from 'lucide-react';

import type { Task, Column } from '@/api/types';
import { CreateBranchDialog } from '@/components/CreateBranchDialog';
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { useSettings } from '@/hooks/useSettings';
import { buildKaitenUrl } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFilterStore } from '@/state/filterStore';

export interface TaskCardProps {
  task: Task;
  columns: Column[];
  onClick?: () => void;
  className?: string;
  showColumn?: boolean;
}

function getColumnName(columns: Column[], columnId: number): string {
  return columns.find((c) => c.id === columnId)?.name ?? `#${columnId}`;
}

/**
 * Islands-style task row for the list view.
 * Clicking opens the detail dialog; the external link icon opens Kaiten in browser.
 */
export function TaskCard({ task, columns, onClick, className, showColumn = true }: TaskCardProps) {
  const column = getColumnName(columns, task.columnId);
  const settings = useSettings();
  const selectedSpaceId = useFilterStore((s) => s.selectedSpaceId);
  const [showCreateBranch, setShowCreateBranch] = React.useState(false);

  const kaitenUrl = buildKaitenUrl(settings.serverUrl, selectedSpaceId, task.id);

  return (
    <Stack
      direction="row"
      align="start"
      spacing="2.5"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'group border-border mx-2 my-1 rounded-lg border',
        'bg-card cursor-pointer px-3 py-2.5',
        'shadow-island-sm hover:shadow-island transition-all duration-150',
        'hover:border-primary/30',
        className,
      )}
    >
      {/* Task ID */}
      <span className="text-muted-foreground mt-0.5 shrink-0 font-mono text-xs tabular-nums">
        #{task.id}
      </span>

      {/* Content */}
      <Stack className="min-w-0 flex-1" spacing="0">
        <p className="group-hover:text-primary truncate text-sm leading-snug transition-colors">
          {task.title}
        </p>
        <Stack
          direction="row"
          wrap="wrap"
          align="center"
          spacing="1.5"
          className="text-muted-foreground mt-1 text-xs"
        >
          {task.participants
            .sort((p) => (p.type === 2 ? -1 : 1))
            .map((participant) => {
              const src =
                participant.avatar_type === 3
                  ? participant.avatar_uploaded_url
                  : participant.avatar_initials_url;

              return (
                <Avatar key={participant.id} className="size-6">
                  <AvatarImage src={src} alt="User" />
                  <AvatarFallback>{participant.initials}</AvatarFallback>
                  {participant.type === 2 && (
                    <AvatarBadge className="-right-1 -bottom-1" variant="destructive" />
                  )}
                </Avatar>
              );
            })}
          {task.dueDate && (
            <span className="shrink-0 tabular-nums">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {showColumn && (
            <Badge variant="secondary" size="xs" className="font-normal">
              {column}
            </Badge>
          )}
        </Stack>
      </Stack>

      {/* Actions visible on hover */}
      <Stack
        direction="row"
        align="center"
        spacing="1"
        className="mt-0.5 shrink-0 opacity-0 transition-all group-hover:opacity-100"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateBranch(true);
          }}
          className="text-muted-foreground hover:text-primary transition-colors"
          title="Create branch for this task"
        >
          <GitBranch size={12} />
        </button>
        {kaitenUrl && (
          <a
            href={kaitenUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Open in Kaiten"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </Stack>

      {showCreateBranch && (
        <CreateBranchDialog
          taskId={task.id}
          branchPatterns={settings.branchPatterns}
          onClose={() => setShowCreateBranch(false)}
        />
      )}
    </Stack>
  );
}
