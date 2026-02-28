import * as React from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, Search } from 'lucide-react';

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

export const ITEM_HEIGHT = 28;
export const MAX_VISIBLE_ITEMS = 8;

interface ComboboxListProps {
  options: ComboboxOption[];
  isSelected: (value: string) => boolean;
  onSelect: (value: string) => void;
  searchPlaceholder?: string;
  emptyText?: string;
}

export function ComboboxList({
  options,
  isSelected,
  onSelect,
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
}: ComboboxListProps) {
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
