import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { bridge } from '@/bridge/JCEFBridge';
import { timeTrackerKeys } from '@/api/endpoints';
import { aggregateDailySeconds, formatDuration } from '@/lib/format';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BranchRow } from '@/components/time-tracker/BranchRow';
import { BranchDetail } from '@/components/time-tracker/BranchDetail';
import { Activity, GitBranch, RefreshCw, Search } from 'lucide-react';

export const Route = createFileRoute('/time-tracker')({
  component: TimeTrackerComponent,
});

const activityChartConfig = {
  seconds: {
    label: 'Time',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

function TimeTrackerComponent() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: branchEntries, isLoading } = useQuery({
    queryKey: timeTrackerKeys.branches(),
    queryFn: () => bridge.call('getBranchTimeEntries', undefined),
    refetchInterval: 5_000,
    staleTime: 0,
  });

  const handleRefresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: timeTrackerKeys.branches() });
  }, [queryClient]);

  // Aggregate daily data across all branches for the activity chart
  const aggregatedDaily = useMemo(
    () => (branchEntries ? aggregateDailySeconds(branchEntries) : []),
    [branchEntries],
  );

  // If a branch is selected, show its detail view
  if (selectedBranch && branchEntries) {
    const data = branchEntries[selectedBranch];
    if (data) {
      return (
        <BranchDetail
          branch={selectedBranch}
          data={data}
          onBack={() => setSelectedBranch(null)}
        />
      );
    }
    // Branch data disappeared (cleared) — fall back to list
    setSelectedBranch(null);
  }

  // Sort branches: active first, then by total time descending
  const sortedBranches = Object.entries(branchEntries ?? {}).sort(([, a], [, b]) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return b.total - a.total;
  });

  // Filter by search query
  const filteredBranches = search
    ? sortedBranches.filter(([branch]) =>
        branch.toLowerCase().includes(search.toLowerCase())
      )
    : sortedBranches;

  return (
    <Layout
      header={
        <>
          <Stack direction="row" align="center" spacing="1.5" className="flex-1">
            <GitBranch size={12} className="text-muted-foreground" />
            <Text variant="body" className="text-muted-foreground">Branch Time</Text>
          </Stack>
          <Text variant="dimmed" className="tabular-nums">
            {sortedBranches.length} branch{sortedBranches.length !== 1 ? 'es' : ''}
          </Text>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" onClick={handleRefresh}>
                <RefreshCw size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
        </>
      }
    >
      {isLoading ? (
        <Stack align="center" justify="center" spacing="2" className="py-10 text-muted-foreground">
          <Activity size={14} className="animate-pulse" />
          <Text variant="dimmed">Loading…</Text>
        </Stack>
      ) : sortedBranches.length === 0 ? (
        <Stack align="center" justify="center" spacing="2" className="py-10 text-muted-foreground">
          <GitBranch size={20} className="opacity-30" />
          <Text variant="dimmed" className="text-center px-4">
            No branch time recorded yet.
            <br />
            Open a task branch and start working.
          </Text>
        </Stack>
      ) : (
        <>
          {/* Activity bar chart */}
          {aggregatedDaily.length > 0 && (
            <Card variant="island" className="mt-2 px-2 py-3">
              <div className="px-1 pb-1.5">
                <Text variant="overline">Activity</Text>
              </div>
              <ChartContainer config={activityChartConfig} className="h-[120px] w-full">
                <BarChart data={aggregatedDaily}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    }
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatDuration(v)}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatDuration(value as number)}
                      />
                    }
                  />
                  <Bar dataKey="seconds" fill="var(--color-seconds)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Card>
          )}

          {/* Branch search */}
          <div className="px-3 pt-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                size="sm"
                placeholder="Search branches…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Branch list */}
          {filteredBranches.length === 0 ? (
            <Stack align="center" justify="center" spacing="1" className="py-6 text-muted-foreground">
              <Text variant="dimmed">No branches match your search</Text>
            </Stack>
          ) : (
            <Card variant="island">
              <div className="divide-y divide-border">
                {filteredBranches.map(([branch, data]) => (
                  <BranchRow
                    key={branch}
                    branch={branch}
                    data={data}
                    onClick={() => setSelectedBranch(branch)}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Layout>
  );
}
