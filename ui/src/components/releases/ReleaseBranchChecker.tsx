/**
 * UI block for entering a release branch name and checking
 * if child task branches have been merged into it.
 */

import { AlertCircle, GitBranch, Loader2 } from 'lucide-react';

import type { Task } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

export interface ReleaseBranchCheckerProps {
  releaseBranchInput: string;
  onInputChange: (value: string) => void;
  onCheck: () => void;
  isLoading: boolean;
  error: Error | null;
  releaseBranch: string | null;
  childTasks: Task[];
  branchPatterns: string[];
  branchResults: Record<string, boolean> | undefined;
}

export function ReleaseBranchChecker({
  releaseBranchInput,
  onInputChange,
  onCheck,
  isLoading,
  error,
  releaseBranch,
  childTasks,
  branchPatterns,
  branchResults,
}: ReleaseBranchCheckerProps) {
  const mergedCount =
    releaseBranch && !isLoading && !error && branchResults
      ? childTasks.filter((t) =>
          branchPatterns.some((p) => branchResults[p.replace('{id}', String(t.id))]),
        ).length
      : null;

  return (
    <Stack spacing="1.5">
      <Stack direction="row" align="center" spacing="1.5">
        <GitBranch size={13} className="text-muted-foreground shrink-0" />
        <Text variant="overline">Release branch</Text>
      </Stack>
      <Stack direction="row" align="center" spacing="1">
        <Input
          size="sm"
          placeholder="e.g. release/v1.0.0"
          value={releaseBranchInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCheck();
          }}
          className="flex-1"
        />
        <Button variant="outline" size="xs" onClick={onCheck} disabled={isLoading}>
          {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Check'}
        </Button>
      </Stack>
      {error && (
        <Stack direction="row" align="center" spacing="1">
          <AlertCircle size={12} className="text-destructive shrink-0" />
          <Text variant="dimmed" className="text-destructive">
            {error.message}
          </Text>
        </Stack>
      )}
      {mergedCount !== null && (
        <Text variant="dimmed" className="text-muted-foreground">
          {mergedCount} / {childTasks.length} tasks added to{' '}
          <span className="font-mono">{releaseBranch}</span>
        </Text>
      )}
    </Stack>
  );
}
