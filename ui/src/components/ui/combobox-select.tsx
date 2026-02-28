import * as React from 'react';

import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ComboboxList } from '@/components/ui/combobox-list';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxSelectOption {
  value: string;
  label: string;
}

interface ComboboxSelectProps {
  options: ComboboxSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function ComboboxSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
}: ComboboxSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = options.find((opt) => opt.value === value);

  function handleSelect(optValue: string) {
    onChange(optValue === value ? null : optValue);
    setOpen(false);
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
          <span className="truncate">
            {selected ? (
              selected.label
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onWheel={(e) => e.stopPropagation()}
      >
        {open && (
          <ComboboxList
            options={options}
            isSelected={(v) => v === value}
            onSelect={handleSelect}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
