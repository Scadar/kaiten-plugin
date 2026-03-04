/**
 * InlineEditText — click-to-edit inline text field.
 *
 * Shows children in read mode; switches to an Input on click.
 * Escape cancels. Enter / blur saves (calls onSave).
 * Visual unsaved-change indicator via a subtle left border accent.
 */
import * as React from 'react';

import { Loader2, Pencil } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface InlineEditTextProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  /** Placeholder shown in the input when empty */
  placeholder?: string;
  className?: string;
  /** Extra classes applied to the input element */
  inputClassName?: string;
  /** If true, the field renders as a multiline textarea */
  multiline?: false;
  disabled?: boolean;
}

export function InlineEditText({
  value,
  onSave,
  placeholder = 'Click to edit…',
  className,
  inputClassName,
  disabled,
}: InlineEditTextProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Prevents the blur handler from calling commit() when cancel was already triggered
  const cancelledRef = React.useRef(false);

  // Sync external value into draft when not editing
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function startEdit() {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function cancel() {
    cancelledRef.current = true;
    setDraft(value);
    setEditing(false);
  }

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    if (!trimmed) {
      setDraft(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Blur triggers onBlur → commit(); this avoids a double-call if we also called commit() here
      inputRef.current?.blur();
    }
  }

  function handleBlur() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    void commit();
  }

  if (editing) {
    return (
      <div className={cn('relative flex items-center gap-1', className)}>
        <Input
          ref={inputRef}
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={saving}
          className={cn('flex-1', inputClassName)}
          autoFocus
        />
        {saving && <Loader2 size={12} className="text-muted-foreground shrink-0 animate-spin" />}
      </div>
    );
  }

  return (
    <span
      role="button"
      tabIndex={disabled ? undefined : 0}
      onClick={startEdit}
      onKeyDown={(e) => e.key === 'Enter' && startEdit()}
      className={cn(
        'group/edit inline-flex min-w-[2rem] cursor-text items-baseline gap-1 rounded px-0.5',
        'hover:border-border/60 hover:bg-accent/30 border border-transparent',
        'focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none',
        'transition-colors duration-100',
        disabled && 'pointer-events-none cursor-default',
        className,
      )}
      title={disabled ? undefined : 'Click to edit'}
    >
      {value || <span className="text-muted-foreground italic">{placeholder}</span>}
      {!disabled && (
        <Pencil
          size={10}
          className="text-muted-foreground/0 group-hover/edit:text-muted-foreground/70 shrink-0 self-center transition-colors duration-100"
        />
      )}
    </span>
  );
}
