/**
 * Advanced filter types and utilities for Kaiten API.
 *
 * Supports building nested AND/OR filter trees that are encoded
 * as base64 JSON for the Kaiten /cards?filter= query parameter.
 *
 * API filter schema:
 * {
 *   "key": "and",
 *   "value": [
 *     { "key": "or", "value": [
 *         { "key": "owner_id", "comparison": "eq", "value": 2 }
 *     ]}
 *   ]
 * }
 */

// ---------------------------------------------------------------------------
// Filter key types — must match Kaiten API allowed values exactly
// ---------------------------------------------------------------------------

export type StaticFilterKey =
  | 'id' // Card ID
  | 'responsible' // Responsible user
  | 'member' // Member of the card
  | 'tag' // Tag
  | 'asap' // ASAP / urgent
  | 'state' // Card state (workflow state)
  | 'type_id' // Card type
  | 'source' // Source (integration)
  | 'condition'; // Card condition: 1=active, 2=done, 3=archived

/**
 * FilterKey extends the static keys with custom property keys (id_<number>).
 * Custom property conditions are serialized as { key: "id_45", comparison, value }.
 * The `(string & {})` trick preserves autocomplete for static keys in IDEs.
 */
export type FilterKey = StaticFilterKey | (string & {});

/** Returns true if the key is a custom property key (id_<number>) */
export function isCustomPropertyKey(key: FilterKey): boolean {
  return /^id_\d+$/.test(key);
}

/** Extracts the numeric custom property ID from a key like "id_45" */
export function customPropertyIdFromKey(key: FilterKey): number | null {
  const match = /^id_(\d+)$/.exec(key);
  return match ? parseInt(match[1]!, 10) : null;
}

/** Builds a custom property filter key from a numeric ID */
export function customPropertyKey(id: number): string {
  return `id_${id}`;
}

export type FilterComparison =
  | 'eq' // equals
  | 'ne' // not equals
  | 'in' // value is in array
  | 'not_in' // value is not in array
  | 'true' // flag is true
  | 'false' // flag is false
  | 'known' // has a value
  | 'unknown'; // has no value

// ---------------------------------------------------------------------------
// Internal node types
// ---------------------------------------------------------------------------

/** A single filter condition (leaf node in the filter tree) */
export interface FilterCondition {
  id: string;
  key: FilterKey;
  comparison: FilterComparison;
  /** Condition value — absent for boolean comparisons */
  value?: number | number[] | string | string[];
  /**
   * For custom property conditions (key = "id_<N>") only.
   * Stores the property type (e.g. "select", "text") so the serializer can
   * include the required "type" field in the API payload.
   */
  customPropertyType?: string;
}

/** A group of conditions combined with AND or OR logic */
export interface FilterGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: FilterNode[];
}

/** A node in the filter tree — either a leaf condition or a nested group */
export type FilterNode = FilterCondition | FilterGroup;

// ---------------------------------------------------------------------------
// Named / saved filter
// ---------------------------------------------------------------------------

export interface SavedFilter {
  id: string;
  name: string;
  /** Optional board scope — maps to the board_id query param, enables Kanban view */
  boardId?: number | null;
  /** Column IDs to show (client-side filter; empty = all columns) */
  columnIds?: number[];
  /** Root filter group */
  group: FilterGroup;
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'logic' in node && 'conditions' in node;
}

export function isFilterCondition(node: FilterNode): node is FilterCondition {
  return 'key' in node && 'comparison' in node && !('logic' in node);
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return crypto.randomUUID();
}

export function createCondition(key: FilterKey = 'responsible'): FilterCondition {
  return {
    id: newId(),
    key,
    comparison: defaultComparison(key),
  };
}

export function createGroup(logic: 'and' | 'or' = 'or'): FilterGroup {
  return {
    id: newId(),
    logic,
    conditions: [createCondition()],
  };
}

export function createRootGroup(): FilterGroup {
  return {
    id: newId(),
    logic: 'and',
    conditions: [createGroup('or')],
  };
}

function defaultComparison(key: FilterKey): FilterComparison {
  if (isCustomPropertyKey(key)) return 'eq';
  switch (key) {
    case 'asap':
      return 'true';
    case 'tag':
    case 'source':
      return 'known';
    case 'id':
    case 'responsible':
    case 'member':
    case 'state':
    case 'type_id':
    case 'condition':
    default:
      return 'eq';
  }
}

// ---------------------------------------------------------------------------
// Serialisation → Kaiten API format
// ---------------------------------------------------------------------------

/**
 * Normalise a group before serialisation.
 *
 * The Kaiten API requires that children of AND groups are always groups
 * themselves (and/or), not raw conditions.  Any condition that is a direct
 * child of an AND group gets automatically wrapped in an OR group so the
 * encoded JSON always satisfies the API constraint, regardless of how the
 * filter was constructed in the UI.
 */
export function normalizeGroup(group: FilterGroup): FilterGroup {
  const normalizedConditions = group.conditions.map((node) => {
    if (isFilterCondition(node)) {
      // Naked condition inside an AND group → wrap in OR group
      if (group.logic === 'and') {
        return {
          id: `auto-or-${node.id}`,
          logic: 'or' as const,
          conditions: [node],
        } satisfies FilterGroup;
      }
      return node;
    }
    // Recurse into sub-groups
    return normalizeGroup(node);
  });

  return { ...group, conditions: normalizedConditions };
}

export function serializeNode(node: FilterNode): object {
  if (isFilterGroup(node)) {
    return {
      key: node.logic,
      value: node.conditions.map(serializeNode),
    };
  }

  // Custom property: API requires key="custom_property" + id + type as separate fields
  if (isCustomPropertyKey(node.key)) {
    const propId = customPropertyIdFromKey(node.key);
    const obj: Record<string, unknown> = {
      key: 'custom_property',
      id: propId,
      type: node.customPropertyType ?? 'select',
      comparison: node.comparison,
    };
    if (node.value !== undefined) {
      obj.value = node.value;
    }
    return obj;
  }

  const obj: Record<string, unknown> = {
    key: node.key,
    comparison: node.comparison,
  };
  if (node.value !== undefined) {
    obj.value = node.value;
  }
  return obj;
}

/**
 * Encodes a FilterGroup to a base64 string suitable for the Kaiten API
 * `filter` query parameter.
 *
 * Automatically normalises the group so that AND groups never contain
 * raw conditions directly (they are wrapped in OR groups).
 */
export function encodeFilter(group: FilterGroup): string {
  const normalized = normalizeGroup(group);
  const payload = JSON.stringify(serializeNode(normalized));
  return btoa(
    encodeURIComponent(payload).replace(/%([0-9A-F]{2})/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
}

// ---------------------------------------------------------------------------
// UI metadata
// ---------------------------------------------------------------------------

export const FILTER_KEY_LABELS: Record<StaticFilterKey, string> = {
  id: 'Card ID',
  responsible: 'Responsible',
  member: 'Member',
  tag: 'Tag',
  asap: 'Urgent (ASAP)',
  state: 'State',
  type_id: 'Card type',
  source: 'Source',
  condition: 'Condition',
};

export const COMPARISON_LABELS: Record<FilterComparison, string> = {
  eq: 'is',
  ne: 'is not',
  in: 'is one of',
  not_in: 'is not one of',
  true: 'is true',
  false: 'is false',
  known: 'is set',
  unknown: 'is not set',
};

/** Valid comparisons for each static filter key */
export const KEY_COMPARISONS: Record<StaticFilterKey, FilterComparison[]> = {
  id: ['eq', 'ne', 'in', 'not_in'],
  responsible: ['eq', 'ne', 'known', 'unknown'],
  member: ['eq', 'ne', 'known', 'unknown'],
  tag: ['eq', 'ne', 'known', 'unknown'],
  asap: ['true', 'false'],
  state: ['eq', 'ne'],
  type_id: ['eq', 'ne'],
  source: ['eq', 'ne', 'known', 'unknown'],
  condition: ['eq'],
};

/** Returns valid comparisons for any FilterKey including custom property keys */
export function getKeyComparisons(key: FilterKey): FilterComparison[] {
  if (isCustomPropertyKey(key)) {
    return ['eq', 'ne', 'in', 'not_in', 'known', 'unknown'];
  }
  return KEY_COMPARISONS[key as StaticFilterKey];
}

/** Whether a comparison requires the user to supply a value */
export function needsValue(_key: FilterKey, comparison: FilterComparison): boolean {
  return (
    comparison !== 'true' &&
    comparison !== 'false' &&
    comparison !== 'known' &&
    comparison !== 'unknown'
  );
}

/** Condition codes (for `condition` key) */
export const CONDITION_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '2', label: 'Done' },
  { value: '3', label: 'Archived' },
];
