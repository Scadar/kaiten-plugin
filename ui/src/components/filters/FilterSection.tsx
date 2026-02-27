import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-accent/40 transition-colors rounded-md">
        <ChevronRight
          size={11}
          className="shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/section:rotate-90"
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Stack spacing="2" className="px-3 pb-2.5 pt-1">
          {children}
        </Stack>
      </CollapsibleContent>
    </Collapsible>
  );
}
