import { type ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { Stack } from '@/components/ui/stack';

export interface FieldRowProps {
  label: string;
  children: ReactNode;
}

/** Settings form field row: label above input/children. */
export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <Stack spacing="1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </Stack>
  );
}
