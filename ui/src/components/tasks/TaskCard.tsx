import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildKaitenUrl } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';
import { useFilterStore } from '@/state/filterStore';
import type { Task, Column } from '@/api/types';
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';

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
  const column          = getColumnName(columns, task.columnId);
  const settings        = useSettings();
  const selectedSpaceId = useFilterStore((s) => s.selectedSpaceId);

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
        'group mx-2 my-1 rounded-lg border border-border',
        'bg-card px-3 py-2.5 cursor-pointer',
        'shadow-island-sm hover:shadow-island transition-all duration-150',
        'hover:border-primary/30',
        className
      )}
    >
      {/* Task ID */}
      <span className="mt-0.5 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
        #{task.id}
      </span>

      {/* Content */}
      <Stack className="min-w-0 flex-1" spacing="0">
        <p className="truncate text-sm leading-snug group-hover:text-primary transition-colors">
          {task.title}
        </p>
        <Stack
          direction="row"
          wrap="wrap"
          align="center"
          spacing="1.5"
          className="mt-1 text-xs text-muted-foreground"
        >
          {task.participants && (
            task.participants?.sort(p => p.type === 2 ? -1 : 1).map((participant) => {
              const src = participant.avatar_type === 3
                ? participant.avatar_uploaded_url
                : participant.avatar_initials_url;

              return (
                <Avatar key={participant.id} className="size-6">
                  <AvatarImage src={src} alt="User" />
                  <AvatarFallback>{participant.initials}</AvatarFallback>
                  {participant?.type === 2 && (
                    <AvatarBadge className="-bottom-1 -right-1" variant="destructive" />
                  )}
                </Avatar>
              );
            })
          )}
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

      {/* Open in Kaiten — visible on hover */}
      {kaitenUrl && (
        <a
          href={kaitenUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
          title="Open in Kaiten"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </Stack>
  );
}
