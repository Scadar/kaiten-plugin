import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion } from '@/components/ui/accordion';
import { LogRow } from '@/components/logs/LogRow';
import { useLogStore, type LogEntryType } from '@/state/logStore';
import { Trash2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/logs')({
  component: LogsComponent,
});

type Filter = 'all' | LogEntryType;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',  value: 'all' },
  { label: 'REQ',  value: 'request' },
  { label: 'OK',   value: 'success' },
  { label: 'WARN', value: 'warning' },
  { label: 'ERR',  value: 'error' },
];

function LogsComponent() {
  const entries = useLogStore((s) => s.entries);
  const clear   = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const visible = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const counts = {
    request: entries.filter((e) => e.type === 'request').length,
    success: entries.filter((e) => e.type === 'success').length,
    warning: entries.filter((e) => e.type === 'warning').length,
    error:   entries.filter((e) => e.type === 'error').length,
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    measureElement: (el) => el.getBoundingClientRect().height,
    getItemKey: (index) => visible[index].id,
    overscan: 5,
  });

  return (
    <Layout
      header={
        <>
          <Text variant="body" className="flex-1 text-muted-foreground">Logs</Text>
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
      <div className="flex flex-col h-full overflow-hidden">
        {/* Filter chips */}
        <Stack
          direction="row"
          align="center"
          spacing="1"
          className="border-b border-border px-2 py-1.5 shrink-0 overflow-x-auto"
        >
          {FILTERS.map(({ label, value }) => {
            const count = value === 'all' ? entries.length : counts[value as LogEntryType];
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-0.5 text-xs font-mono transition-all border',
                  filter === value
                    ? 'bg-primary text-primary-foreground border-primary shadow-island-sm'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
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
              <Stack align="center" justify="center" spacing="2" className="py-8 text-muted-foreground">
                <ArrowDown size={20} className="opacity-30" />
                <Text variant="dimmed">
                  {entries.length === 0 ? 'No requests yet.' : 'No entries match filter.'}
                </Text>
              </Stack>
            </Card>
          </div>
        ) : (
          <div ref={parentRef} className="flex-1 min-h-0 overflow-auto p-2">
            <Card variant="island" className="p-0 overflow-hidden">
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
                      <LogRow entry={visible[vRow.index]} />
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
