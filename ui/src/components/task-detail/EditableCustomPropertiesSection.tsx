import * as React from 'react';

import { Check, Loader2, X } from 'lucide-react';

import type { CustomPropertySelectValue } from '@/api/types';
import { PlainTextContent } from '@/components/task-detail/RichTextContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useCardCustomProperties } from '@/hooks/useKaitenQuery';

const KAITEN_COLORS: string[] = [
  '#E53E3E',
  '#DD6B20',
  '#D69E2E',
  '#38A169',
  '#319795',
  '#3182CE',
  '#805AD5',
  '#D53F8C',
  '#718096',
  '#2D3748',
  '#FC8181',
  '#F6AD55',
  '#F6E05E',
  '#68D391',
  '#4FD1C5',
  '#63B3ED',
  '#B794F4',
  '#F687B3',
  '#A0AEC0',
  '#E2E8F0',
  '#9C4221',
  '#276749',
  '#2C7A7B',
  '#2B6CB0',
];

function getKaitenColor(index: number | null): string | undefined {
  if (index === null || index < 0) return undefined;
  return KAITEN_COLORS[index % KAITEN_COLORS.length];
}

function TextPropertyEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  async function commit() {
    if (draft.trim() === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft.trim());
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') {
              setDraft(value);
              setEditing(false);
            }
          }}
          onBlur={() => void commit()}
          disabled={saving}
          autoFocus
          className="h-5 py-0 text-xs"
        />
        {saving && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
      </div>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      className="hover:bg-accent/40 cursor-text rounded px-0.5 text-sm transition-colors"
      title="Click to edit"
    >
      {value ? (
        <PlainTextContent text={value} className="text-sm break-words whitespace-pre-wrap" />
      ) : (
        <span className="text-muted-foreground italic">—</span>
      )}
    </span>
  );
}

function NumberPropertyEditor({
  value,
  onSave,
}: {
  value: number | string;
  onSave: (v: number) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);
  async function commit() {
    const num = parseFloat(draft);
    if (isNaN(num)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(num);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') {
              setDraft(String(value));
              setEditing(false);
            }
          }}
          onBlur={() => void commit()}
          disabled={saving}
          autoFocus
          className="h-5 w-24 py-0 text-xs"
        />
        {saving && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
      </div>
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      className="hover:bg-accent/40 cursor-text rounded px-0.5 text-sm transition-colors"
      title="Click to edit"
    >
      {value !== '' ? String(value) : <span className="text-muted-foreground italic">—</span>}
    </span>
  );
}

function DatePropertyEditor({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string | null) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value.slice(0, 10));
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (!open) setDraft(value.slice(0, 10));
  }, [value, open]);
  async function commit() {
    setSaving(true);
    try {
      await onSave(draft || null);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="hover:bg-accent/40 cursor-pointer rounded px-0.5 text-sm transition-colors"
          title="Click to edit date"
        >
          {saving && (
            <Loader2 size={11} className="text-muted-foreground mr-1 inline animate-spin" />
          )}
          {value ? value.slice(0, 10) : <span className="text-muted-foreground italic">—</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 space-y-2 p-3">
        <Input
          type="date"
          size="sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-6 flex-1 gap-1 text-xs" onClick={() => void commit()}>
            <Check size={11} /> Save
          </Button>
          {value && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={async () => {
                setSaving(true);
                await onSave(null);
                setSaving(false);
                setOpen(false);
              }}
            >
              <X size={11} />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectPropertyEditor({
  selectedIds,
  selectValues,
  colorful,
  multiSelect,
  onSave,
}: {
  selectedIds: number[];
  selectValues: CustomPropertySelectValue[];
  colorful: boolean;
  multiSelect: boolean;
  onSave: (ids: number[]) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const options = selectValues.map((v) => ({ value: String(v.id), label: v.value }));
  const strIds = selectedIds.map(String);
  async function handleChange(vals: string[] | string | null) {
    const ids = Array.isArray(vals) ? vals.map(Number) : vals !== null ? [Number(vals)] : [];
    if (!multiSelect) setOpen(false);
    setSaving(true);
    try {
      await onSave(ids);
    } finally {
      setSaving(false);
    }
  }
  const badges = selectedIds.map((id) => {
    const val = selectValues.find((v) => v.id === id);
    if (!val) return null;
    const color = colorful ? getKaitenColor(val.color) : undefined;
    return (
      <Badge
        key={id}
        variant="outline"
        size="xs"
        className="font-normal"
        style={color ? { borderColor: color, color } : undefined}
      >
        {val.value}
      </Badge>
    );
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="hover:bg-accent/40 flex cursor-pointer flex-wrap gap-1 rounded px-0.5 transition-colors"
          title="Click to edit"
        >
          {saving && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
          {badges.length > 0 ? (
            <Stack direction="row" wrap="wrap" spacing="1">
              {badges}
            </Stack>
          ) : (
            <span className="text-muted-foreground text-sm italic">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        {multiSelect ? (
          <ComboboxSelect
            multiple
            options={options}
            value={strIds}
            onChange={(vals) => void handleChange(vals)}
            placeholder="Select values..."
            searchPlaceholder="Search..."
          />
        ) : (
          <ComboboxSelect
            options={options}
            value={strIds[0] ?? null}
            onChange={(val) => void handleChange(val)}
            placeholder="Select a value..."
            searchPlaceholder="Search..."
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface EditableCustomPropertiesSectionProps {
  properties: Record<string, unknown>;
  onSaveProperty: (propertyId: number, value: unknown) => Promise<void>;
}

export function EditableCustomPropertiesSection({
  properties,
  onSaveProperty,
}: EditableCustomPropertiesSectionProps) {
  const { data, isLoading } = useCardCustomProperties(properties);
  if (Object.keys(properties).length === 0) return null;
  if (isLoading && data.length === 0) return null;
  if (data.length === 0) return null;
  return (
    <Stack spacing="1.5">
      {data.map(({ property, selectedValueIds, selectValues }) => {
        const numericIds = selectedValueIds.filter((id): id is number => typeof id === 'number');
        return (
          <Stack key={property.id} direction="row" align="start" spacing="2" className="text-sm">
            <Text variant="dimmed" className="w-24 shrink-0 truncate pt-0.5" title={property.name}>
              {property.name}
            </Text>
            <div className="min-w-0 flex-1">
              {property.type === 'select' && selectValues ? (
                <SelectPropertyEditor
                  selectedIds={numericIds}
                  selectValues={selectValues}
                  colorful={property.colorful}
                  multiSelect={property.multiSelect}
                  onSave={(ids) =>
                    onSaveProperty(property.id, property.multiSelect ? ids : (ids[0] ?? null))
                  }
                />
              ) : property.type === 'number' ? (
                <NumberPropertyEditor
                  value={selectedValueIds[0] ?? ''}
                  onSave={(v) => onSaveProperty(property.id, v)}
                />
              ) : property.type === 'date' ? (
                <DatePropertyEditor
                  value={String(selectedValueIds[0] ?? '')}
                  onSave={(v) => onSaveProperty(property.id, v)}
                />
              ) : (
                <TextPropertyEditor
                  value={selectedValueIds.map(String).join(', ')}
                  onSave={(v) => onSaveProperty(property.id, v)}
                />
              )}
            </div>
          </Stack>
        );
      })}
    </Stack>
  );
}
