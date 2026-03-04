/**
 * EditableDescription — collapsible description section with inline edit.
 *
 * Read mode: renders rich text (same as before).
 * Edit mode: textarea for Markdown/plain text entry with Save / Cancel.
 * Unsaved changes prompt is handled via visual indicator.
 */
import * as React from 'react';

import { ChevronRight, Loader2, Pencil, X } from 'lucide-react';

import { RichTextContent } from '@/components/task-detail/RichTextContent';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface EditableDescriptionProps {
  description: string | null;
  fileUids?: string[];
  onSave: (value: string | null) => Promise<void> | void;
  isSaving?: boolean;
}

export function EditableDescription({
  description,
  fileUids,
  onSave,
  isSaving,
}: EditableDescriptionProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(description ?? '');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Sync if external value changes (e.g., optimistic rollback)
  React.useEffect(() => {
    if (!editing) setDraft(description ?? '');
  }, [description, editing]);

  function startEdit() {
    setDraft(description ?? '');
    setEditing(true);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    });
  }

  function cancel() {
    setDraft(description ?? '');
    setEditing(false);
  }

  async function commit() {
    const trimmed = draft.trim() || null;
    await onSave(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
    // Ctrl+Enter / Cmd+Enter → save
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void commit();
    }
  }

  const hasContent = Boolean(description);

  return (
    <Collapsible defaultOpen className="group/desc">
      {/* Header row — group/header drives pencil visibility on hover */}
      <div className="group/header flex items-center gap-1">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 text-left">
          <ChevronRight
            size={11}
            className="text-muted-foreground shrink-0 transition-transform duration-150 group-data-[state=open]/desc:rotate-90"
          />
          <span className="text-muted-foreground flex-1 text-xs font-semibold tracking-wider uppercase">
            Description
          </span>
        </CollapsibleTrigger>

        {!editing && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/header:opacity-100"
            onClick={startEdit}
            title="Edit description (click)"
          >
            <Pencil size={11} />
          </Button>
        )}
      </div>

      <CollapsibleContent>
        {editing ? (
          <div className="mt-1.5 space-y-2 pl-4">
            <Textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a description… (Ctrl+Enter to save, Escape to cancel)"
              className="min-h-[120px] font-mono text-sm"
              disabled={isSaving}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void commit()}
                disabled={isSaving}
                className="h-6 text-xs"
              >
                {isSaving ? <Loader2 size={11} className="mr-1 animate-spin" /> : null}
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
                disabled={isSaving}
                className="h-6 gap-1 text-xs"
              >
                <X size={11} />
                Cancel
              </Button>
              <span className="text-muted-foreground text-xs">Ctrl+Enter · Esc to cancel</span>
            </div>
          </div>
        ) : (
          /* group/body drives inline pencil on content hover */
          <div className="group/body mt-1.5 pl-4">
            <div
              role="button"
              tabIndex={0}
              onClick={startEdit}
              onKeyDown={(e) => e.key === 'Enter' && startEdit()}
              className={cn(
                'relative cursor-text rounded',
                'hover:border-border/60 hover:bg-accent/20 border border-transparent',
                'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none',
                'p-1 transition-colors duration-100',
              )}
              title="Click to edit"
            >
              {hasContent ? (
                <p className="text-foreground/90 pr-5 text-sm leading-relaxed break-words whitespace-pre-wrap">
                  <RichTextContent html={description!} excludeUids={fileUids} />
                </p>
              ) : (
                <p className="text-muted-foreground py-0.5 text-sm italic">Add a description…</p>
              )}
              <Pencil
                size={11}
                className="text-muted-foreground/0 group-hover/body:text-muted-foreground/60 absolute top-1.5 right-1.5 transition-colors duration-100"
              />
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
