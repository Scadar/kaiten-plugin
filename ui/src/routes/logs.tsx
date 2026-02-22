import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLogStore, type LogEntry, type LogEntryType } from '@/state/logStore';
import { Trash2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

function typeBadge(type: LogEntryType) {
  switch (type) {
    case 'request':
      return <Badge variant="outline" className="h-4 rounded-sm px-1 py-0 text-[10px] font-mono shrink-0">REQ</Badge>;
    case 'success':
      return <Badge className="h-4 rounded-sm px-1 py-0 text-[10px] font-mono shrink-0 bg-green-600 hover:bg-green-600">OK</Badge>;
    case 'warning':
      return <Badge className="h-4 rounded-sm px-1 py-0 text-[10px] font-mono shrink-0 bg-yellow-500 hover:bg-yellow-500 text-black">WARN</Badge>;
    case 'error':
      return <Badge variant="destructive" className="h-4 rounded-sm px-1 py-0 text-[10px] font-mono shrink-0">ERR</Badge>;
  }
}

function entryBorderClass(type: LogEntryType) {
  switch (type) {
    case 'success': return 'border-l-2 border-green-600';
    case 'warning': return 'border-l-2 border-yellow-500';
    case 'error':   return 'border-l-2 border-red-600';
    default:        return 'border-l-2 border-transparent';
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hms = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${hms}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function shortUrl(url: string) {
  try { return new URL(url).pathname; } catch { return url; }
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn('px-2 py-1.5 hover:bg-muted/40 cursor-pointer select-text', entryBorderClass(entry.type))}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] text-muted-foreground font-mono shrink-0 tabular-nums">
          {formatTime(entry.timestamp)}
        </span>
        {typeBadge(entry.type)}
        {entry.status !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{entry.status}</span>
        )}
        <span className="text-[11px] font-mono truncate flex-1 min-w-0" title={entry.url}>
          {shortUrl(entry.url)}
        </span>
        {entry.duration !== undefined && (
          <span className="text-[10px] text-muted-foreground font-mono shrink-0 tabular-nums">
            {entry.duration}ms
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-1.5 text-[11px] font-mono text-muted-foreground space-y-1 pl-1">
          <div><span className="text-foreground/60">msg: </span>{entry.message}</div>
          <div><span className="text-foreground/60">url: </span><span className="break-all">{entry.url}</span></div>
          {entry.retryCount !== undefined && (
            <div><span className="text-foreground/60">retry: </span>{entry.retryCount}</div>
          )}
          {entry.stack && (
            <div className="mt-1">
              <div className="text-foreground/60 mb-0.5">stack:</div>
              <pre className="whitespace-pre-wrap break-all text-red-400/80 bg-red-950/20 rounded p-1.5 text-[10px] leading-relaxed">
                {entry.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogsComponent() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');

  const visible = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const counts = {
    request: entries.filter((e) => e.type === 'request').length,
    success: entries.filter((e) => e.type === 'success').length,
    warning: entries.filter((e) => e.type === 'warning').length,
    error: entries.filter((e) => e.type === 'error').length,
  };

  return (
    <Layout
      header={
        <>
          <span className="flex-1 text-xs font-medium text-muted-foreground">
            Logs
          </span>
          <span className="text-[11px] text-muted-foreground">{entries.length}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
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
      {/* Filter chips */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5 overflow-x-auto">
        {FILTERS.map(({ label, value }) => {
          const count = value === 'all' ? entries.length : counts[value as LogEntryType];
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'shrink-0 rounded px-2 py-0.5 text-[11px] font-mono transition-colors border',
                filter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              )}
            >
              {label}
              {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Log list */}
      <div className="divide-y divide-border">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <ArrowDown size={20} className="opacity-30" />
            <p className="text-xs">
              {entries.length === 0 ? 'No requests yet.' : 'No entries match filter.'}
            </p>
          </div>
        ) : (
          visible.map((entry) => <LogRow key={entry.id} entry={entry} />)
        )}
      </div>
    </Layout>
  );
}
