import type { BranchTimeData } from '@/bridge/types';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { formatDuration, formatRelativeDate } from '@/lib/format';
import { cn } from '@/lib/utils';

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
      className="border-border hover:bg-secondary/60 group h-auto w-full justify-start rounded-none border-b px-3 py-2.5 text-left last:border-b-0"
    >
      <Stack spacing="0" className="w-full min-w-0">
        <Stack direction="row" align="center" spacing="2" className="w-full min-w-0">
          {/* Active indicator */}
          <div
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              data.isActive ? 'bg-green-500' : 'bg-muted-foreground/30',
            )}
          />
          {/* Branch name */}
          <span className="text-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {branch}
          </span>
          {/* Total time */}
          <span
            className={cn(
              'shrink-0 text-xs font-medium tabular-nums',
              data.isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {formatDuration(data.total)}
          </span>
        </Stack>

        {/* Last active */}
        {data.lastActive && (
          <span className="text-muted-foreground mt-0.5 w-full pl-3.5 text-left text-xs">
            {formatRelativeDate(data.lastActive)}
          </span>
        )}
      </Stack>
    </Button>
  );
}
