import * as React from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export interface MultiComboboxOption {
  value: string;
  label: string;
}

interface MultiComboboxProps {
  options: MultiComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

const ITEM_HEIGHT = 28;
const MAX_VISIBLE_ITEMS = 8;

export function MultiCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found.',
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
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
    if (open) {
      setSearch('');
      setActiveIndex(-1);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  function handleSelect(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

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
        if (opt) handleSelect(opt.value);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter((l): l is string => l !== undefined);

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  const listHeight = Math.min(filtered.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate text-left flex-1', value.length === 0 && 'text-muted-foreground')}>
            {displayText}
          </span>
          <span className="flex items-center ml-2 shrink-0 gap-1">
            {value.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onWheel={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center border-b border-border px-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-2 pl-2 text-xs outline-none placeholder:text-muted-foreground"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">{emptyText}</div>
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
                const isSelected = value.includes(opt.value);
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
                      'flex cursor-pointer select-none items-center gap-2 px-2 text-xs',
                      isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setActiveIndex(virtualItem.index)}
                  >
                    <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
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
      </PopoverContent>
    </Popover>
  );
}
