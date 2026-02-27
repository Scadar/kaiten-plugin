import { ChevronRight, Link as LinkIcon } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { TaskDetail } from '@/api/types';

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
          className="shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/links:rotate-90"
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Links
        </span>
        <span className="ml-1 text-xs text-muted-foreground">({links.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 pl-4 flex flex-col gap-1">
          {links.map((link, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <LinkIcon size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate block"
                  title={link.url}
                >
                  {link.description || link.url}
                </a>
                {link.description && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {link.url}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
