/**
 * Displays the active release card header: ID, column badge, condition badge,
 * blocked badge, title, due date, tags, and external Kaiten link.
 */

import { ExternalLink } from 'lucide-react';

import type { TaskDetail } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { CONDITION_LABELS } from '@/lib/format';

export interface ReleaseCardSummaryProps {
  task: TaskDetail;
  columnName: string | undefined;
  kaitenUrl: string | null;
}

export function ReleaseCardSummary({ task, columnName, kaitenUrl }: ReleaseCardSummaryProps) {
  const conditionLabel = task.condition !== null ? CONDITION_LABELS[task.condition] : null;

  return (
    <Stack direction="row" align="start" spacing="2">
      <Stack className="min-w-0 flex-1" spacing="0">
        <Stack direction="row" align="center" wrap="wrap" spacing="2" className="mb-1">
          <span className="text-muted-foreground shrink-0 font-mono text-xs">#{task.id}</span>
          {columnName && (
            <Badge variant="secondary" size="xs" className="font-normal">
              {columnName}
            </Badge>
          )}
          {conditionLabel && (
            <Badge variant="outline" size="xs" className="font-normal">
              {conditionLabel}
            </Badge>
          )}
          {task.blocked && (
            <Badge variant="destructive" size="xs" className="font-normal">
              Blocked
            </Badge>
          )}
        </Stack>
        <p className="text-sm leading-snug font-semibold">{task.title}</p>
      </Stack>

      {kaitenUrl && (
        <a
          href={kaitenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary shrink-0 text-xs transition-colors"
          title="Open in Kaiten"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </Stack>
  );
}

export function ReleaseTags({ task }: { task: TaskDetail }) {
  if (task.tags.length === 0) return null;
  return (
    <Stack direction="row" wrap="wrap" spacing="1">
      {task.tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          size="xs"
          className="font-normal"
          style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
        >
          {tag.name}
        </Badge>
      ))}
    </Stack>
  );
}

export function ReleaseDueDate({ task }: { task: TaskDetail }) {
  if (!task.dueDate) return null;
  return <Text variant="dimmed">Due: {new Date(task.dueDate).toLocaleDateString()}</Text>;
}
