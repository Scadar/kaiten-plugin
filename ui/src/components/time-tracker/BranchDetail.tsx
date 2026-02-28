import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Clock, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { timeTrackerKeys } from '@/api/endpoints';
import { bridge } from '@/bridge/JCEFBridge';
import type { BranchTimeData } from '@/bridge/types';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Stack } from '@/components/ui/stack';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Text } from '@/components/ui/typography';
import { formatDuration } from '@/lib/format';

export interface BranchDetailProps {
  branch: string;
  data: BranchTimeData;
  onBack: () => void;
}

const dailyChartConfig = {
  seconds: {
    label: 'Time',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

/** Detail view for a single branch: summary and daily breakdown chart. */
export function BranchDetail({ branch, data, onBack }: BranchDetailProps) {
  const queryClient = useQueryClient();

  const handleClear = async () => {
    await bridge.call('clearBranchEntries', branch);
    await queryClient.invalidateQueries({ queryKey: timeTrackerKeys.branches() });
    onBack();
  };

  // Sort daily breakdown oldest first for chart (left-to-right chronological)
  const chartData = [...data.daily].sort((a, b) => a.date.localeCompare(b.date));
  const dayCount = chartData.length;

  return (
    <Layout
      header={
        <>
          <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={onBack}>
            <ArrowLeft size={13} />
          </Button>
          <span className="text-foreground min-w-0 flex-1 truncate font-mono text-xs">
            {branch}
          </span>
          {data.isActive && (
            <Stack
              direction="row"
              align="center"
              spacing="1"
              className="shrink-0 text-xs text-green-600 dark:text-green-500"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Active
            </Stack>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive/70 hover:text-destructive shrink-0"
                onClick={handleClear}
              >
                <Trash2 size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear time entries</TooltipContent>
          </Tooltip>
        </>
      }
    >
      {/* Summary island */}
      <Card variant="island" className="mt-2 mb-1 px-3 py-2.5">
        <Stack direction="row" align="center" spacing="3">
          <Stack align="center" spacing="0.5" className="flex-1">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-lg font-semibold tabular-nums">{formatDuration(data.total)}</span>
            <Text variant="dimmed">Total</Text>
          </Stack>
          <div className="bg-border h-8 w-px" />
          <Stack align="center" spacing="0.5" className="flex-1">
            <CalendarDays size={14} className="text-muted-foreground" />
            <span className="text-lg font-semibold tabular-nums">{dayCount}</span>
            <Text variant="dimmed">Days</Text>
          </Stack>
        </Stack>
      </Card>

      {/* Daily breakdown chart */}
      {dayCount > 0 && (
        <>
          <div className="px-3 pt-2 pb-0.5">
            <Text variant="overline">Daily breakdown</Text>
          </div>
          <Card variant="island" className="px-2 py-3">
            <ChartContainer config={dailyChartConfig} className="h-[200px] w-full">
              <BarChart data={chartData}>
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
                  width={45}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value) => formatDuration(value as number)} />
                  }
                />
                <Bar dataKey="seconds" fill="var(--color-seconds)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Card>
        </>
      )}
    </Layout>
  );
}
