import { ChevronRight } from 'lucide-react';

import { RichTextContent } from '@/components/task-detail/RichTextContent';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface TaskDescriptionProps {
  description: string;
  fileUids?: string[];
}

/**
 * Collapsible description section for the task detail view.
 */
export function TaskDescription({ description, fileUids }: TaskDescriptionProps) {
  return (
    <Collapsible defaultOpen className="group/desc">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-left">
        <ChevronRight
          size={11}
          className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-[state=open]/desc:rotate-90"
        />
        <span className="text-muted-foreground flex-1 text-xs font-semibold tracking-wider uppercase">
          Description
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="text-foreground/90 mt-1.5 pl-4 text-sm leading-relaxed break-words whitespace-pre-wrap">
          <RichTextContent html={description} excludeUids={fileUids} />
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
