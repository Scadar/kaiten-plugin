import * as React from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

// Backward-compat alias used in FilterConditionRow and elsewhere
export type ComboboxSelectOption = ComboboxOption;

type ComboboxSelectProps = {
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
} & (
  | { multiple?: false; value: string | null; onChange: (value: string | null) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

// ---------- inner virtualized list ----------

const ITEM_HEIGHT = 28;
const MAX_VISIBLE_ITEMS = 8;

interface InnerListProps {
  options: ComboboxOption[];
  isSelected: (value: string) => boolean;
  onSelect: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}

function InnerList({
  options,
  isSelected,
  onSelect,
  searchPlaceholder,
  emptyText,
}: InnerListProps) {
  const [search, setSearch] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [listElement, setListElement] = React.useState<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listElement,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  React.useEffect(() => {
    setSearch('');
    setActiveIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(activeIndex + 1, filtered.length - 1);
      setActiveIndex(next);
      virtualizer.scrollToIndex(next, { align: 'auto' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(activeIndex - 1, 0);
      setActiveIndex(prev);
      virtualizer.scrollToIndex(prev, { align: 'auto' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        const opt = filtered[activeIndex];
        if (opt) onSelect(opt.value);
      }
    }
  }

  const listHeight = Math.min(filtered.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT;

  return (
    <>
      <div className="border-border flex items-center border-b px-2">
        <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <input
          ref={inputRef}
          className="placeholder:text-muted-foreground flex-1 bg-transparent py-2 pl-2 text-xs outline-none"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-6 text-center text-xs">{emptyText}</div>
      ) : (
        <div
          ref={setListElement}
          className="overflow-y-auto"
          style={{ height: `${listHeight}px` }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const opt = filtered[virtualItem.index];
              if (!opt) return null;
              const selected = isSelected(opt.value);
              const isActive = virtualItem.index === activeIndex;

              return (
                <div
                  key={opt.value}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-2 text-xs select-none',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
                  )}
                  onClick={() => onSelect(opt.value)}
                  onMouseEnter={() => setActiveIndex(virtualItem.index)}
                >
                  <Check
                    className={cn('h-3.5 w-3.5 shrink-0', selected ? 'opacity-100' : 'opacity-0')}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate">{opt.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>{opt.label}</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- public component ----------

export function ComboboxSelect(props: ComboboxSelectProps) {
  const {
    options,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    emptyText = 'No results found.',
    className,
    multiple,
  } = props;

  const [open, setOpen] = React.useState(false);

  function handleSelect(optValue: string) {
    if (multiple) {
      const cur = props.value;
      props.onChange(
        cur.includes(optValue) ? cur.filter((v) => v !== optValue) : [...cur, optValue],
      );
    } else {
      props.onChange(optValue === props.value ? null : optValue);
      setOpen(false);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    (props.onChange as (v: string[]) => void)([]);
  }

  const isSelected = multiple
    ? (v: string) => props.value.includes(v)
    : (v: string) => v === props.value;

  // ---------- trigger label ----------

  let triggerContent: React.ReactNode;

  if (multiple) {
    const selected = props.value;
    const labels = selected
      .map((v) => options.find((o) => o.value === v)?.label)
      .filter((l): l is string => l !== undefined);

    const text =
      labels.length === 0 ? null : labels.length === 1 ? labels[0] : `${labels.length} selected`;

    triggerContent = (
      <>
        <span
          className={cn(
            'flex-1 truncate text-left',
            selected.length === 0 && 'text-muted-foreground',
          )}
        >
          {text ?? placeholder}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="hover:text-destructive flex h-3.5 w-3.5 items-center justify-center rounded-full"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </span>
      </>
    );
  } else {
    const selectedOpt = options.find((opt) => opt.value === props.value);
    triggerContent = (
      <>
        <span className="truncate">
          {selectedOpt ? (
            selectedOpt.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {triggerContent}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onWheel={(e) => e.stopPropagation()}
      >
        {open && (
          <InnerList
            options={options}
            isSelected={isSelected}
            onSelect={handleSelect}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
