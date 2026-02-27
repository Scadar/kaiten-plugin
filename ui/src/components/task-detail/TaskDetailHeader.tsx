import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';

export interface TaskDetailHeaderProps {
  taskId: number;
  columnName: string | undefined;
  onBack: () => void;
  kaitenUrl?: string | null;
}

/** Sticky header island for the task detail view. */
export function TaskDetailHeader({ taskId, columnName, onBack, kaitenUrl }: TaskDetailHeaderProps) {
  return (
    <Stack
      direction="row"
      align="center"
      spacing="1.5"
      className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-sm px-2 py-1.5 shadow-island-sm"
    >
      <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={onBack}>
        <ArrowLeft size={13} />
      </Button>
      <span className="font-mono text-xs text-muted-foreground">#{taskId}</span>
      <Stack direction="row" align="center" spacing="1.5" className="ml-auto">
        {columnName && (
          <Badge variant="secondary" size="xs" className="font-normal">
            {columnName}
          </Badge>
        )}
        {kaitenUrl && (
          <a
            href={kaitenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Open in Kaiten"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </Stack>
    </Stack>
  );
}
