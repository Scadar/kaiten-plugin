import { ReactNode } from 'react';
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
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-sm min-w-0">{children}</span>
    </Stack>
  );
}
