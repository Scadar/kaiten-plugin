import * as React from 'react';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

// ---------- Context ----------

interface ComboboxContextValue {
  multiple: boolean;
  selectedValues: string[];
  toggleValue: (val: string) => void;
  allItems: readonly unknown[];
  filterText: string;
  setFilterText: (text: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  itemToStringValue: (item: unknown) => string;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext() {
  const ctx = React.useContext(ComboboxContext);
  if (!ctx) throw new Error('Must be used within <Combobox>');
  return ctx;
}

// ---------- Root ----------

interface ComboboxProps<T = string> {
  multiple?: boolean;
  autoHighlight?: boolean;
  items: readonly T[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  itemToStringValue?: (item: T) => string;
  children: React.ReactNode;
}

function Combobox<T = string>({
  multiple = false,
  items,
  value: valueProp,
  defaultValue,
  onValueChange,
  itemToStringValue = (item: T) => String(item),
  children,
}: ComboboxProps<T>) {
  const [internalValues, setInternalValues] = React.useState<string[]>(defaultValue ?? []);
  const [open, setOpen] = React.useState(false);
  const [filterText, setFilterText] = React.useState('');

  const selectedValues = valueProp ?? internalValues;

  function toggleValue(val: string) {
    const next = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : multiple
        ? [...selectedValues, val]
        : [val];

    if (valueProp === undefined) setInternalValues(next);
    onValueChange?.(next);

    if (!multiple) {
      setOpen(false);
      setFilterText('');
    }
  }

  const ctx: ComboboxContextValue = {
    multiple,
    selectedValues,
    toggleValue,
    allItems: items as readonly unknown[],
    filterText,
    setFilterText,
    open,
    setOpen,
    itemToStringValue: itemToStringValue as (item: unknown) => string,
  };

  return (
    <ComboboxContext.Provider value={ctx}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

// ---------- useComboboxAnchor ----------

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

// ---------- ComboboxChips ----------

const ComboboxChips = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, children, ...props }, ref) => {
    const { setOpen } = useComboboxContext();

    return (
      <PopoverPrimitive.Anchor asChild>
        <div
          ref={ref}
          data-slot="combobox-chips"
          className={cn(
            'border-border focus-within:border-ring focus-within:ring-ring/50',
            'bg-input flex min-h-7 flex-wrap items-center gap-1.5 rounded-md border',
            'px-2.5 py-1.5 text-[length:var(--ide-font-size-sm)] transition-[color,box-shadow]',
            'cursor-text focus-within:ring-[3px]',
            'has-data-[slot=combobox-chip]:px-1.5',
            className,
          )}
          onClick={(e) => {
            // open on click, but not when a chip remove button was the target
            const target = e.target as HTMLElement;
            if (!target.closest('[data-slot=combobox-chip-remove]')) {
              setOpen(true);
            }
          }}
          {...props}
        >
          {children}
        </div>
      </PopoverPrimitive.Anchor>
    );
  },
);
ComboboxChips.displayName = 'ComboboxChips';

// ---------- ComboboxValue ----------

interface ComboboxValueProps {
  children: (values: string[]) => React.ReactNode;
}

function ComboboxValue({ children }: ComboboxValueProps) {
  const { selectedValues } = useComboboxContext();
  return <>{children(selectedValues)}</>;
}

// ---------- ComboboxChip ----------

interface ComboboxChipProps {
  children: React.ReactNode;
  value?: string;
  className?: string;
}

function ComboboxChip({ children, value: valueProp, className }: ComboboxChipProps) {
  const { toggleValue } = useComboboxContext();
  const chipValue = valueProp ?? (typeof children === 'string' ? children : '');

  return (
    <span
      data-slot="combobox-chip"
      className={cn(
        'bg-muted text-foreground flex h-[22px] items-center gap-0.5 rounded-sm pl-1.5 text-[length:var(--ide-font-size-xs)] font-medium whitespace-nowrap',
        className,
      )}
    >
      {children}
      <button
        type="button"
        data-slot="combobox-chip-remove"
        onClick={(e) => {
          e.stopPropagation();
          toggleValue(chipValue);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
        aria-label={`Remove ${chipValue}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// ---------- ComboboxChipsInput ----------

function ComboboxChipsInput({
  className,
  placeholder,
  ...props
}: React.ComponentPropsWithoutRef<'input'>) {
  const { filterText, setFilterText, setOpen } = useComboboxContext();

  return (
    <input
      data-slot="combobox-chip-input"
      value={filterText}
      onChange={(e) => {
        setFilterText(e.target.value);
        setOpen(true);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
      placeholder={placeholder}
      className={cn(
        'placeholder:text-muted-foreground min-w-16 flex-1 bg-transparent text-[length:var(--ide-font-size-sm)] outline-none',
        className,
      )}
      {...props}
    />
  );
}

// ---------- ComboboxContent ----------

interface ComboboxContentProps extends Omit<
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>,
  'children'
> {
  anchor?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  anchor: _anchor,
  children,
  ...props
}: ComboboxContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        align={align}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as Element;
          if (target.closest('[data-slot=combobox-chips]')) {
            e.preventDefault();
          }
        }}
        className={cn(
          'bg-popover text-popover-foreground border-border z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

// ---------- ComboboxEmpty ----------

function ComboboxEmpty({ className, children }: { className?: string; children: React.ReactNode }) {
  const { allItems, filterText, itemToStringValue } = useComboboxContext();

  const hasMatches = filterText
    ? allItems.some((item) =>
        itemToStringValue(item).toLowerCase().includes(filterText.toLowerCase()),
      )
    : allItems.length > 0;

  if (hasMatches) return null;

  return (
    <div
      data-slot="combobox-empty"
      className={cn(
        'text-muted-foreground py-4 text-center text-[length:var(--ide-font-size-sm)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------- ComboboxList ----------

interface ComboboxListProps {
  className?: string;
  children: (item: unknown) => React.ReactNode;
}

function ComboboxList({ className, children }: ComboboxListProps) {
  const { allItems, filterText, itemToStringValue } = useComboboxContext();

  const filteredItems = filterText
    ? allItems.filter((item) =>
        itemToStringValue(item).toLowerCase().includes(filterText.toLowerCase()),
      )
    : allItems;

  return (
    <div
      data-slot="combobox-list"
      role="listbox"
      className={cn('max-h-60 overflow-y-auto p-1', className)}
    >
      {filteredItems.map((item) => (
        <React.Fragment key={itemToStringValue(item)}>{children(item)}</React.Fragment>
      ))}
    </div>
  );
}

// ---------- ComboboxItem ----------

interface ComboboxItemProps {
  value: unknown;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function ComboboxItem({ value: valueProp, children, className, disabled }: ComboboxItemProps) {
  const { selectedValues, toggleValue, itemToStringValue } = useComboboxContext();
  const strValue = itemToStringValue(valueProp);
  const isSelected = selectedValues.includes(strValue);

  return (
    <div
      data-slot="combobox-item"
      role="option"
      aria-selected={isSelected}
      data-disabled={disabled ? true : undefined}
      className={cn(
        'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-[length:var(--ide-font-size-sm)] select-none',
        'hover:bg-accent hover:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      onClick={() => {
        if (!disabled) toggleValue(strValue);
      }}
    >
      {children}
      {isSelected && <Check className="absolute right-2 h-4 w-4 shrink-0 opacity-100" />}
    </div>
  );
}

export {
  Combobox,
  ComboboxChips,
  ComboboxValue,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  useComboboxAnchor,
};
