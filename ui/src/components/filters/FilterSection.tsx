import { type ReactNode } from 'react';

import { ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Stack } from '@/components/ui/stack';

export interface FilterSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Islands-style collapsible section used inside FiltersPanel.
 * Has a subtle label header and smooth expand/collapse animation.
 */
export function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/section">
      <CollapsibleTrigger className="hover:bg-accent/40 flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-left transition-colors">
        <ChevronRight
          size={11}
          className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-[state=open]/section:rotate-90"
        />
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Stack spacing="2" className="px-3 pt-1 pb-2.5">
          {children}
        </Stack>
      </CollapsibleContent>
    </Collapsible>
  );
}
