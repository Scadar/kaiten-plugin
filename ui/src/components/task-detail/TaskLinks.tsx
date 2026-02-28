import { ChevronRight, Link as LinkIcon } from 'lucide-react';

import type { TaskDetail } from '@/api/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface TaskLinksProps {
  links: TaskDetail['externalLinks'];
}

/**
 * Collapsible external links section for the task detail view.
 */
export function TaskLinks({ links }: TaskLinksProps) {
  return (
    <Collapsible defaultOpen className="group/links">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-left">
        <ChevronRight
          size={11}
          className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-[state=open]/links:rotate-90"
        />
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Links
        </span>
        <span className="text-muted-foreground ml-1 text-xs">({links.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 flex flex-col gap-1 pl-4">
          {links.map((link, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <LinkIcon size={11} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary block truncate text-xs hover:underline"
                  title={link.url}
                >
                  {link.description ?? link.url}
                </a>
                {link.description && (
                  <span className="text-muted-foreground block truncate text-xs">{link.url}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
