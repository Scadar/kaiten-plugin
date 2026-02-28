import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { cn } from '@/lib/utils';
import type { LogEntry, LogEntryType } from '@/state/logStore';

function typeBadge(type: LogEntryType) {
  switch (type) {
    case 'request':
      return (
        <Badge variant="outline" size="xs" className="shrink-0 px-1 font-mono">
          REQ
        </Badge>
      );
    case 'success':
      return (
        <Badge size="xs" className="shrink-0 bg-green-600 px-1 font-mono hover:bg-green-600">
          OK
        </Badge>
      );
    case 'warning':
      return (
        <Badge
          size="xs"
          className="shrink-0 bg-yellow-500 px-1 font-mono text-black hover:bg-yellow-500"
        >
          WARN
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" size="xs" className="shrink-0 px-1 font-mono">
          ERR
        </Badge>
      );
  }
}

function entryBorderClass(type: LogEntryType): string {
  switch (type) {
    case 'success':
      return 'border-l-2 border-green-500';
    case 'warning':
      return 'border-l-2 border-yellow-500';
    case 'error':
      return 'border-l-2 border-red-500';
    default:
      return 'border-l-2 border-transparent';
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
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export interface LogRowProps {
  entry: LogEntry;
}

/**
 * Compact accordion log entry row.
 */
export function LogRow({ entry }: LogRowProps) {
  return (
    <AccordionItem value={entry.id} className={cn('border-b-0', entryBorderClass(entry.type))}>
      <AccordionTrigger className="hover:bg-muted/40 gap-1.5 px-2 py-1.5 font-normal hover:no-underline">
        <Stack direction="row" align="center" spacing="1.5" className="min-w-0 flex-1">
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {formatTime(entry.timestamp)}
          </span>
          {typeBadge(entry.type)}
          {entry.status !== undefined && (
            <span className="text-muted-foreground shrink-0 font-mono text-xs">{entry.status}</span>
          )}
          <span className="min-w-0 flex-1 truncate font-mono text-xs" title={entry.url}>
            {shortUrl(entry.url)}
          </span>
          {entry.duration !== undefined && (
            <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
              {entry.duration}ms
            </span>
          )}
        </Stack>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-2">
        <Stack spacing="1" className="text-muted-foreground pl-1 font-mono text-xs">
          <div>
            <span className="text-foreground/60">msg: </span>
            {entry.message}
          </div>
          <div>
            <span className="text-foreground/60">url: </span>
            <span className="break-all">{entry.url}</span>
          </div>
          {entry.params && (
            <div>
              <span className="text-foreground/60">params: </span>
              <span className="break-all">{JSON.stringify(entry.params)}</span>
            </div>
          )}
          {entry.retryCount !== undefined && (
            <div>
              <span className="text-foreground/60">retry: </span>
              {entry.retryCount}
            </div>
          )}
          {entry.stack && (
            <div className="mt-1">
              <div className="text-foreground/60 mb-0.5">stack:</div>
              <pre className="rounded-md bg-red-950/20 p-1.5 text-xs leading-relaxed break-all whitespace-pre-wrap text-red-400/80">
                {entry.stack}
              </pre>
            </div>
          )}
        </Stack>
      </AccordionContent>
    </AccordionItem>
  );
}
