import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLogStore, type LogEntry, type LogEntryType } from '@/state/logStore';
import { Trash2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/logs')({
  component: LogsComponent,
});

type Filter = 'all' | LogEntryType;

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Requests', value: 'request' },
  { label: 'Success', value: 'success' },
  { label: 'Warnings', value: 'warning' },
  { label: 'Errors', value: 'error' },
];

function typeBadge(type: LogEntryType) {
  switch (type) {
    case 'request':
      return <Badge variant="outline" className="text-xs font-mono shrink-0">REQ</Badge>;
    case 'success':
      return <Badge className="text-xs font-mono shrink-0 bg-green-600 hover:bg-green-600">OK</Badge>;
    case 'warning':
      return <Badge className="text-xs font-mono shrink-0 bg-yellow-500 hover:bg-yellow-500 text-black">WARN</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs font-mono shrink-0">ERR</Badge>;
  }
}

function entryRowClass(type: LogEntryType) {
  switch (type) {
    case 'success':
      return 'border-l-2 border-green-600';
    case 'warning':
      return 'border-l-2 border-yellow-500';
    case 'error':
      return 'border-l-2 border-red-600';
    default:
      return 'border-l-2 border-transparent';
  }
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hms = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'px-3 py-2 hover:bg-muted/50 cursor-pointer select-text',
        entryRowClass(entry.type)
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted-foreground font-mono shrink-0 tabular-nums">
          {formatTime(entry.timestamp)}
        </span>
        {typeBadge(entry.type)}
        {entry.status !== undefined && (
          <span className="text-xs font-mono text-muted-foreground shrink-0">{entry.status}</span>
        )}
        <span className="text-xs font-mono truncate flex-1 min-w-0" title={entry.url}>
          {shortUrl(entry.url)}
        </span>
        {entry.duration !== undefined && (
          <span className="text-xs text-muted-foreground font-mono shrink-0 tabular-nums">
            {entry.duration}ms
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-2 text-xs font-mono text-muted-foreground space-y-1 pl-1">
          <div>
            <span className="text-foreground/70">message: </span>
            {entry.message}
          </div>
          <div>
            <span className="text-foreground/70">url: </span>
            <span className="break-all">{entry.url}</span>
          </div>
          {entry.retryCount !== undefined && (
            <div>
              <span className="text-foreground/70">retry: </span>
              {entry.retryCount}
            </div>
          )}
          {entry.stack && (
            <div className="mt-1">
              <div className="text-foreground/70 mb-0.5">stack:</div>
              <pre className="whitespace-pre-wrap break-all text-red-400/80 bg-red-950/20 rounded p-2 leading-relaxed">
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
    <Layout sidebar={<Sidebar />}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Logs</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              API requests and errors ({entries.length} entries)
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={entries.length === 0}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b flex items-center gap-2 shrink-0 flex-wrap">
          {FILTERS.map(({ label, value }) => {
            const count = value === 'all' ? entries.length : counts[value as LogEntryType];
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  filter === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/40'
                )}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1.5 opacity-70">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
              <ArrowDown className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                {entries.length === 0
                  ? 'No requests yet. Make some API calls to see logs here.'
                  : 'No entries match the current filter.'}
              </p>
            </div>
          ) : (
            visible.map((entry) => <LogRow key={entry.id} entry={entry} />)
          )}
        </div>
      </div>
    </Layout>
  );
}

function Sidebar() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">Navigation</h2>
        <Navigation />
      </div>
    </div>
  );
}
