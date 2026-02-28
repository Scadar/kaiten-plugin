import { useState, useRef } from 'react';

import { createFileRoute } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Trash2, ArrowDown } from 'lucide-react';

import { Layout } from '@/components/Layout';
import { LogRow } from '@/components/logs/LogRow';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stack } from '@/components/ui/stack';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { useLogStore, type LogEntryType } from '@/state/logStore';

export const Route = createFileRoute('/logs')({
  component: LogsComponent,
});

type Filter = 'all' | LogEntryType;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'REQ', value: 'request' },
  { label: 'OK', value: 'success' },
  { label: 'WARN', value: 'warning' },
  { label: 'ERR', value: 'error' },
];

function LogsComponent() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const visible = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const counts = {
    request: entries.filter((e) => e.type === 'request').length,
    success: entries.filter((e) => e.type === 'success').length,
    warning: entries.filter((e) => e.type === 'warning').length,
    error: entries.filter((e) => e.type === 'error').length,
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    measureElement: (el) => el.getBoundingClientRect().height,
    getItemKey: (index) => visible[index]!.id,
    overscan: 5,
  });

  return (
    <Layout
      header={
        <>
          <Text variant="body" className="text-muted-foreground flex-1">
            Logs
          </Text>
          <Text variant="dimmed">{entries.length}</Text>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={clear}
                disabled={entries.length === 0}
              >
                <Trash2 size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear logs</TooltipContent>
          </Tooltip>
        </>
      }
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Filter chips */}
        <Stack
          direction="row"
          align="center"
          spacing="1"
          className="border-border shrink-0 overflow-x-auto border-b px-2 py-1.5"
        >
          {FILTERS.map(({ label, value }) => {
            const count = value === 'all' ? entries.length : counts[value];
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs transition-all',
                  filter === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-island-sm'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {label}
                {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
              </button>
            );
          })}
        </Stack>

        {/* Log list */}
        {visible.length === 0 ? (
          <div className="p-2">
            <Card variant="island">
              <Stack
                align="center"
                justify="center"
                spacing="2"
                className="text-muted-foreground py-8"
              >
                <ArrowDown size={20} className="opacity-30" />
                <Text variant="dimmed">
                  {entries.length === 0 ? 'No requests yet.' : 'No entries match filter.'}
                </Text>
              </Stack>
            </Card>
          </div>
        ) : (
          <div ref={parentRef} className="min-h-0 flex-1 overflow-auto p-2">
            <Card variant="island" className="overflow-hidden p-0">
              <Accordion type="multiple" value={openItems} onValueChange={setOpenItems}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vRow) => (
                    <div
                      key={vRow.key}
                      data-index={vRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      <LogRow entry={visible[vRow.index]!} />
                    </div>
                  ))}
                </div>
              </Accordion>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
