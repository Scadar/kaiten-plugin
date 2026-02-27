import { ChevronRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RichTextContent } from '@/components/task-detail/RichTextContent';

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
          className="shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]/desc:rotate-90"
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          Description
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words pl-4">
          <RichTextContent html={description} excludeUids={fileUids} />
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
