import { ReactNode } from 'react';
import { Stack } from '@/components/ui/stack';
import { cn } from '@/lib/utils';

export interface InfoRowProps {
  icon?: ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}

/** A single info row on the Home page: optional icon + label + value. */
export function InfoRow({ icon, label, value, mono, truncate }: InfoRowProps) {
  return (
    <Stack direction="row" align="start" spacing="1.5" className="py-0.5">
      {icon && (
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">{label}:</span>
      <span
        className={cn('text-xs min-w-0', mono && 'font-mono', truncate ? 'truncate' : 'break-all')}
        title={value}
      >
        {value}
      </span>
    </Stack>
  );
}
