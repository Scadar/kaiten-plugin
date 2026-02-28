import { type ReactNode } from 'react';

import { Stack } from '@/components/ui/stack';

export interface MetaRowProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

/** A single metadata row in the task detail view (icon + label + value). */
export function MetaRow({ icon, label, children }: MetaRowProps) {
  return (
    <Stack direction="row" align="start" spacing="2" className="py-1">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="text-muted-foreground w-16 shrink-0 text-xs">{label}</span>
      <span className="min-w-0 text-sm">{children}</span>
    </Stack>
  );
}
