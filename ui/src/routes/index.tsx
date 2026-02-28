import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { FolderOpen, FileCode2 } from 'lucide-react';

import { timeTrackerKeys } from '@/api/endpoints';
import { bridge } from '@/bridge/JCEFBridge';
import { InfoRow } from '@/components/home/InfoRow';
import { Layout } from '@/components/Layout';
import { ActivityHeatmap } from '@/components/time-tracker/ActivityHeatmap';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useSyncedFields, useSyncedReady } from '@/hooks/useSyncedState';
import { aggregateDailySeconds } from '@/lib/format';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const { isLoading } = useSyncedReady(true);
  const { projectPath, selectedFile } = useSyncedFields(['projectPath', 'selectedFile'] as const);
  const [heatmapMode, setHeatmapMode] = useState<'time' | 'commits'>('time');

  const { data: branchEntries } = useQuery({
    queryKey: timeTrackerKeys.branches(),
    queryFn: () => bridge.call('getBranchTimeEntries', undefined),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: gitLog } = useQuery({
    queryKey: ['git', 'log'],
    queryFn: () => bridge.call('getGitLog', { maxCount: 500 }),
    staleTime: 60_000,
  });

  // Aggregate daily data across all branches for the heatmap
  const aggregatedDaily = useMemo(
    () => (branchEntries ? aggregateDailySeconds(branchEntries) : []),
    [branchEntries],
  );

  // Aggregate commits per date for commit heatmap
  const aggregatedCommits = useMemo(() => {
    if (!gitLog) return [];
    const dayMap = new Map<string, number>();
    for (const commit of gitLog) {
      const date = new Date(commit.timestamp).toISOString().slice(0, 10);
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }
    return Array.from(dayMap.entries())
      .map(([date, seconds]) => ({ date, seconds }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [gitLog]);

  const projectName = projectPath ? projectPath.split(/[\\/]/).filter(Boolean).pop() : null;

  return (
    <Layout
      header={
        <>
          <Text variant="body">Kaiten Plugin</Text>
          <Stack
            direction="row"
            align="center"
            spacing="1.5"
            className="text-muted-foreground ml-auto text-xs"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Connected
          </Stack>
        </>
      }
    >
      {/* Project info island */}
      <Card variant="island" padding="sm">
        {isLoading ? (
          <Text variant="dimmed">Loading project info...</Text>
        ) : (
          <Stack spacing="0.5">
            <InfoRow
              icon={<FolderOpen size={12} />}
              label="Project"
              value={projectName ?? 'Unknown'}
            />
            {projectPath && <InfoRow label="Path" value={projectPath} mono truncate />}
            {selectedFile && (
              <>
                <Separator className="my-1.5" />
                <InfoRow
                  icon={<FileCode2 size={12} />}
                  label="File"
                  value={selectedFile}
                  mono
                  truncate
                />
              </>
            )}
          </Stack>
        )}
      </Card>

      {/* Activity heatmap */}
      {(aggregatedDaily.length > 0 || aggregatedCommits.length > 0) && (
        <Card variant="island" className="px-3 py-2.5">
          <div className="flex items-center justify-between pb-1.5">
            <Text variant="overline">Activity</Text>
            <div className="flex gap-0.5">
              <Button
                size="xs"
                variant={heatmapMode === 'time' ? 'secondary' : 'ghost'}
                onClick={() => setHeatmapMode('time')}
              >
                Time
              </Button>
              <Button
                size="xs"
                variant={heatmapMode === 'commits' ? 'secondary' : 'ghost'}
                onClick={() => setHeatmapMode('commits')}
              >
                Commits
              </Button>
            </div>
          </div>
          <ActivityHeatmap
            data={heatmapMode === 'time' ? aggregatedDaily : aggregatedCommits}
            valueFormatter={
              heatmapMode === 'commits' ? (v) => `${v} commit${v !== 1 ? 's' : ''}` : undefined
            }
          />
        </Card>
      )}
    </Layout>
  );
}
