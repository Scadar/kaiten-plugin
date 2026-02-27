import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { cn } from '@/lib/utils';
import type { LogEntry, LogEntryType } from '@/state/logStore';

function typeBadge(type: LogEntryType) {
  switch (type) {
    case 'request':
      return (
        <Badge variant="outline" size="xs" className="px-1 font-mono shrink-0">
          REQ
        </Badge>
      );
    case 'success':
      return (
        <Badge size="xs" className="px-1 font-mono shrink-0 bg-green-600 hover:bg-green-600">
          OK
        </Badge>
      );
    case 'warning':
      return (
        <Badge size="xs" className="px-1 font-mono shrink-0 bg-yellow-500 hover:bg-yellow-500 text-black">
          WARN
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" size="xs" className="px-1 font-mono shrink-0">
          ERR
        </Badge>
      );
  }
}

function entryBorderClass(type: LogEntryType): string {
  switch (type) {
    case 'success': return 'border-l-2 border-green-500';
    case 'warning': return 'border-l-2 border-yellow-500';
    case 'error':   return 'border-l-2 border-red-500';
    default:        return 'border-l-2 border-transparent';
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hms = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${hms}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function shortUrl(url: string): string {
  try { return new URL(url).pathname; } catch { return url; }
}

export interface LogRowProps {
  entry: LogEntry;
}

/**
 * Islands-style expandable log entry row.
 */
export function LogRow({ entry }: LogRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'px-2 py-1.5 hover:bg-muted/40 cursor-pointer select-text',
        entryBorderClass(entry.type)
      )}
      onClick={() => setExpanded((v) => !v)}
    >
      <Stack direction="row" align="center" spacing="1.5" className="min-w-0">
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
      </Stack>

      {expanded && (
        <Stack spacing="1" className="mt-1.5 text-xs font-mono text-muted-foreground pl-1">
          <div><span className="text-foreground/60">msg: </span>{entry.message}</div>
          <div><span className="text-foreground/60">url: </span><span className="break-all">{entry.url}</span></div>
          {entry.params  && <div><span className="text-foreground/60">params: </span><span className="break-all">{JSON.stringify(entry.params)}</span></div>}
          {entry.retryCount !== undefined && (
            <div><span className="text-foreground/60">retry: </span>{entry.retryCount}</div>
          )}
          {entry.stack && (
            <div className="mt-1">
              <div className="text-foreground/60 mb-0.5">stack:</div>
              <pre className="whitespace-pre-wrap break-all text-red-400/80 bg-red-950/20 rounded-md p-1.5 text-xs leading-relaxed">
                {entry.stack}
              </pre>
            </div>
          )}
        </Stack>
      )}
    </div>
  );
}
