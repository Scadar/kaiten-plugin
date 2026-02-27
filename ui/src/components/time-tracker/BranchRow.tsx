import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { cn } from '@/lib/utils';
import { formatDuration, formatRelativeDate } from '@/lib/format';
import type { BranchTimeData } from '@/bridge/types';

export interface BranchRowProps {
  branch: string;
  data: BranchTimeData;
  onClick: () => void;
}

export function BranchRow({ branch, data, onClick }: BranchRowProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="w-full h-auto justify-start text-left px-3 py-2.5 rounded-none border-b border-border last:border-b-0 hover:bg-secondary/60 group"
    >
      <Stack spacing="0" className="w-full min-w-0">
        <Stack direction="row" align="center" spacing="2" className="min-w-0 w-full">
          {/* Active indicator */}
          <div
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              data.isActive ? 'bg-green-500' : 'bg-muted-foreground/30'
            )}
          />
          {/* Branch name */}
          <span className="flex-1 truncate font-mono text-xs text-foreground min-w-0">
            {branch}
          </span>
          {/* Total time */}
          <span
            className={cn(
              'shrink-0 text-xs font-medium tabular-nums',
              data.isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {formatDuration(data.total)}
          </span>
        </Stack>

        {/* Last active */}
        {data.lastActive && (
          <span className="mt-0.5 pl-3.5 text-xs text-muted-foreground w-full text-left">
            {formatRelativeDate(data.lastActive)}
          </span>
        )}
      </Stack>
    </Button>
  );
}
