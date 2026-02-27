import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { buildKaitenUrl } from '@/lib/format';
import { useSettings } from '@/hooks/useSettings';
import { useFilterStore } from '@/state/filterStore';
import { cn } from '@/lib/utils';
import type { Task } from '@/api/types';

interface KanbanTaskCardProps {
  task: Task;
  onClick?: () => void;
}

function getAssigneeName(task: Task): string | null {
  if (!task.assigneeId) return null;
  const assignee = task.participants.find((m) => m.id === task.assigneeId);
  return assignee?.fullName ?? `User ${task.assigneeId}`;
}

/** Islands-style Kanban task card with click-to-open dialog */
export function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
  const assigneeName     = getAssigneeName(task);
  const participantCount = task.participants.length;
  const settings         = useSettings();
  const selectedSpaceId  = useFilterStore((s) => s.selectedSpaceId);

  const kaitenUrl = buildKaitenUrl(settings.serverUrl, selectedSpaceId, task.id);

  return (
    <Stack
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'rounded-lg border border-border bg-card p-3 shadow-island',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-island-md hover:border-primary/25'
      )}
      spacing="0"
    >
      {/* ID badge + external link */}
      <Stack direction="row" align="center" justify="between" spacing="1" className="mb-2">
        <Badge variant="outline" size="xs" className="font-mono">
          #{task.id}
        </Badge>
        {kaitenUrl && (
          <a
            href={kaitenUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Open in Kaiten"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </Stack>

      {/* Title */}
      <Text variant="subheading" as="p" className="mb-1.5">
        {task.title}
      </Text>

      {/* Description snippet */}
      {task.description && (
        <Text variant="secondary" as="p" className="line-clamp-2 mb-2 leading-relaxed">
          {task.description.replace(/<[^>]+>/g, '').trim()}
        </Text>
      )}

      {/* Meta */}
      <Stack spacing="0.5" className="text-xs text-muted-foreground">
        {assigneeName && (
          <Stack direction="row" align="center" spacing="1">
            <span className="font-medium">Assignee:</span>
            <span className="truncate">{assigneeName}</span>
          </Stack>
        )}
        {participantCount > 0 && (
          <Stack direction="row" align="center" spacing="1">
            <span className="font-medium">Members:</span>
            <span>{participantCount}</span>
          </Stack>
        )}
        {task.dueDate && (
          <Stack direction="row" align="center" spacing="1">
            <span className="font-medium">Due:</span>
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
