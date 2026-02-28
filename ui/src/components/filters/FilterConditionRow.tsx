import { X } from 'lucide-react';

import type { User, Tag, CardType } from '@/api/types';
import { Button } from '@/components/ui/button';
import {
  ComboboxSelect,
  type ComboboxSelectOption as ComboboxOption,
} from '@/components/ui/combobox-select';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import type { CustomPropertyWithValues } from '@/hooks/useKaitenQuery';
import {
  type FilterCondition,
  type FilterKey,
  type FilterComparison,
  type StaticFilterKey,
  FILTER_KEY_LABELS,
  COMPARISON_LABELS,
  CONDITION_OPTIONS,
  needsValue,
  createCondition,
  isCustomPropertyKey,
  customPropertyIdFromKey,
  customPropertyKey,
  getKeyComparisons,
} from '@/lib/advancedFilters';

interface FilterConditionRowProps {
  condition: FilterCondition;
  users: User[];
  tags: Tag[];
  cardTypes: CardType[];
  customProperties: CustomPropertyWithValues[];
  onChange: (updated: FilterCondition) => void;
  onRemove: () => void;
  disableRemove?: boolean;
}

const STATIC_KEYS: StaticFilterKey[] = [
  'responsible',
  'member',
  'tag',
  'asap',
  'condition',
  'state',
  'type_id',
  'source',
  'id',
];

export function FilterConditionRow({
  condition,
  users,
  tags,
  cardTypes,
  customProperties,
  onChange,
  onRemove,
  disableRemove = false,
}: FilterConditionRowProps) {
  function handleKeyChange(key: FilterKey) {
    const fresh = createCondition(key);
    const cp = isCustomPropertyKey(key)
      ? customProperties.find((p) => customPropertyKey(p.id) === key)
      : undefined;
    onChange({
      ...fresh,
      id: condition.id,
      ...(cp ? { customPropertyType: cp.type } : {}),
    });
  }

  function handleComparisonChange(comparison: FilterComparison) {
    const next: FilterCondition = { ...condition, comparison };
    if (!needsValue(condition.key, comparison)) {
      delete next.value;
    }
    onChange(next);
  }

  function handleSingleNumberValue(raw: string | null) {
    const num = raw ? Number(raw) : undefined;
    onChange({ ...condition, value: num });
  }

  function handleStringValue(raw: string) {
    onChange({ ...condition, value: raw.trim() || undefined });
  }

  function handleMultiIdValue(raw: string) {
    const ids = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n) && n > 0);
    onChange({ ...condition, value: ids.length > 0 ? ids : undefined });
  }

  const comparisons = getKeyComparisons(condition.key);
  const showValue = needsValue(condition.key, condition.comparison);

  // Build field options: static keys + custom properties
  const staticOptions: ComboboxOption[] = STATIC_KEYS.map((k) => ({
    value: k,
    label: FILTER_KEY_LABELS[k],
  }));

  const customPropOptions: ComboboxOption[] = customProperties.map((cp) => ({
    value: customPropertyKey(cp.id),
    label: cp.name,
    group: 'Custom properties',
  }));

  const fieldOptions: ComboboxOption[] = [...staticOptions, ...customPropOptions];

  const comparisonOptions: ComboboxOption[] = comparisons.map((c) => ({
    value: c,
    label: COMPARISON_LABELS[c],
  }));

  const userOptions: ComboboxOption[] = users.map((u) => ({ value: String(u.id), label: u.name }));
  const tagOptions: ComboboxOption[] = tags.map((t) => ({ value: String(t.id), label: t.name }));
  const typeOptions: ComboboxOption[] = cardTypes.map((ct) => ({
    value: String(ct.id),
    label: ct.name,
  }));
  const conditionOptions: ComboboxOption[] = CONDITION_OPTIONS;

  const currentSingleValue =
    condition.value !== undefined && !Array.isArray(condition.value)
      ? String(condition.value)
      : null;

  const currentMultiValue = Array.isArray(condition.value)
    ? (condition.value as number[]).join(', ')
    : '';

  // For custom property key: find the matching custom property definition
  const customPropId = isCustomPropertyKey(condition.key)
    ? customPropertyIdFromKey(condition.key)
    : null;
  const customProp =
    customPropId !== null ? customProperties.find((cp) => cp.id === customPropId) : null;
  const customPropSelectOptions: ComboboxOption[] =
    customProp?.selectValues.map((sv) => ({
      value: String(sv.id),
      label: sv.value,
    })) ?? [];

  return (
    <Stack direction="row" wrap="wrap" align="center" spacing="1" className="py-0.5">
      {/* Field selector */}
      <ComboboxSelect
        options={fieldOptions}
        value={condition.key}
        onChange={(val) => val && handleKeyChange(val as FilterKey)}
        placeholder="Field…"
        searchPlaceholder="Search fields…"
        emptyText="No fields."
        className="h-7 w-58 shrink-0 text-xs"
      />

      {/* Comparison selector */}
      <ComboboxSelect
        options={comparisonOptions}
        value={condition.comparison}
        onChange={(val) => val && handleComparisonChange(val as FilterComparison)}
        placeholder="Condition…"
        searchPlaceholder="Search…"
        emptyText="No options."
        className="h-7 w-28 shrink-0 text-xs"
      />

      {/* Value picker */}
      {showValue && (
        <>
          {(condition.key === 'responsible' || condition.key === 'member') && (
            <ComboboxSelect
              options={userOptions}
              value={currentSingleValue}
              onChange={handleSingleNumberValue}
              placeholder="Select user…"
              searchPlaceholder="Search users…"
              emptyText="No users found."
              className="h-7 min-w-36 flex-1 text-xs"
            />
          )}

          {condition.key === 'tag' && (
            <ComboboxSelect
              options={tagOptions}
              value={currentSingleValue}
              onChange={handleSingleNumberValue}
              placeholder={tagOptions.length ? 'Select tag…' : 'No tags loaded'}
              searchPlaceholder="Search tags…"
              emptyText="No tags found."
              className="h-7 min-w-36 flex-1 text-xs"
            />
          )}

          {condition.key === 'type_id' && (
            <ComboboxSelect
              options={typeOptions}
              value={currentSingleValue}
              onChange={handleSingleNumberValue}
              placeholder={typeOptions.length ? 'Select type…' : 'No types loaded'}
              searchPlaceholder="Search types…"
              emptyText="No types found."
              className="h-7 min-w-36 flex-1 text-xs"
            />
          )}

          {condition.key === 'condition' && (
            <ComboboxSelect
              options={conditionOptions}
              value={currentSingleValue}
              onChange={handleSingleNumberValue}
              placeholder="Select condition…"
              searchPlaceholder="Search…"
              emptyText="No options."
              className="h-7 min-w-28 flex-1 text-xs"
            />
          )}

          {(condition.key === 'state' || condition.key === 'source') && (
            <Input
              size="sm"
              className="min-w-28 flex-1"
              value={typeof condition.value === 'string' ? condition.value : ''}
              onChange={(e) => handleStringValue(e.target.value)}
              placeholder={condition.key === 'state' ? 'State name…' : 'Source name…'}
            />
          )}

          {condition.key === 'id' &&
            (condition.comparison === 'eq' || condition.comparison === 'ne') && (
              <Input
                type="number"
                size="sm"
                className="w-24"
                value={typeof condition.value === 'number' ? condition.value : ''}
                onChange={(e) => handleSingleNumberValue(e.target.value || null)}
                placeholder="Card ID…"
                min={1}
              />
            )}

          {condition.key === 'id' &&
            (condition.comparison === 'in' || condition.comparison === 'not_in') && (
              <Input
                size="sm"
                className="min-w-36 flex-1"
                value={currentMultiValue}
                onChange={(e) => handleMultiIdValue(e.target.value)}
                placeholder="1, 2, 3…"
              />
            )}

          {/* Custom property value picker */}
          {isCustomPropertyKey(condition.key) &&
            customProp?.type === 'select' &&
            (condition.comparison === 'eq' || condition.comparison === 'ne' ? (
              <ComboboxSelect
                options={customPropSelectOptions}
                value={currentSingleValue}
                onChange={handleSingleNumberValue}
                placeholder={
                  customPropSelectOptions.length ? `Select ${customProp.name}…` : 'Loading…'
                }
                searchPlaceholder={`Search ${customProp.name}…`}
                emptyText="No values found."
                className="h-7 min-w-36 flex-1 text-xs"
              />
            ) : condition.comparison === 'in' || condition.comparison === 'not_in' ? (
              <Input
                size="sm"
                className="min-w-36 flex-1"
                value={currentMultiValue}
                onChange={(e) => handleMultiIdValue(e.target.value)}
                placeholder="Value IDs: 1, 2, 3…"
              />
            ) : null)}

          {isCustomPropertyKey(condition.key) && customProp && customProp.type !== 'select' && (
            <Input
              size="sm"
              className="min-w-28 flex-1"
              value={
                typeof condition.value === 'string'
                  ? condition.value
                  : String(condition.value ?? '')
              }
              onChange={(e) => handleStringValue(e.target.value)}
              placeholder="Value…"
            />
          )}
        </>
      )}

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto shrink-0 disabled:opacity-30"
        disabled={disableRemove}
        onClick={onRemove}
        aria-label="Remove condition"
      >
        <X size={12} />
      </Button>
    </Stack>
  );
}
