/**
 * FilterBuilder — recursive AND/OR filter tree builder.
 *
 * The Kaiten API requires a strict two-level structure:
 *
 *   AND (root)
 *    ├── OR group   ← each OR group is one "and-clause"
 *    │    ├── condition A
 *    │    └── condition B   (A or B must match)
 *    └── OR group
 *         └── condition C   (C must also match)
 *
 * At depth=0 (root AND): children are always OR groups.
 *   "Add condition group" adds a new OR group with a default condition.
 *
 * At depth≥1 (OR groups): children are conditions (or nested groups).
 *   "Add condition" adds a new condition to the group.
 */

import { Plus, Trash2 } from 'lucide-react';

import type { User, Tag, CardType } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import type { CustomPropertyWithValues } from '@/hooks/useKaitenQuery';
import {
  type FilterGroup,
  type FilterNode,
  type FilterCondition,
  isFilterGroup,
  isFilterCondition,
  createCondition,
  createGroup,
} from '@/lib/advancedFilters';

import { FilterConditionRow } from './FilterConditionRow';

interface FilterBuilderProps {
  group: FilterGroup;
  onChange: (updated: FilterGroup) => void;
  users: User[];
  tags: Tag[];
  cardTypes: CardType[];
  customProperties: CustomPropertyWithValues[];
  /** Internal — depth from the root for visual indentation */
  depth?: number;
}

function replaceNode(group: FilterGroup, nodeId: string, updated: FilterNode): FilterGroup {
  return {
    ...group,
    conditions: group.conditions.map((n) => {
      if (n.id === nodeId) return updated;
      if (isFilterGroup(n)) return replaceNode(n, nodeId, updated);
      return n;
    }),
  };
}

function removeNode(group: FilterGroup, nodeId: string): FilterGroup {
  return {
    ...group,
    conditions: group.conditions
      .filter((n) => n.id !== nodeId)
      .map((n) => (isFilterGroup(n) ? removeNode(n, nodeId) : n)),
  };
}

export function FilterBuilder({
  group,
  onChange,
  users,
  tags,
  cardTypes,
  customProperties,
  depth = 0,
}: FilterBuilderProps) {
  const isRoot = depth === 0;

  function toggleLogic() {
    onChange({ ...group, logic: group.logic === 'and' ? 'or' : 'and' });
  }

  function addCondition() {
    onChange({ ...group, conditions: [...group.conditions, createCondition()] });
  }

  function addSubGroup() {
    onChange({ ...group, conditions: [...group.conditions, createGroup('or')] });
  }

  function handleConditionChange(updated: FilterCondition) {
    onChange(replaceNode(group, updated.id, updated));
  }

  function handleGroupChange(updated: FilterGroup) {
    onChange(replaceNode(group, updated.id, updated));
  }

  function handleRemoveNode(nodeId: string) {
    onChange(removeNode(group, nodeId));
  }

  const bgClass = isRoot
    ? 'bg-muted/30 border border-border'
    : 'bg-background border border-border/70';

  return (
    <div className={`rounded-lg ${bgClass} p-2`}>
      {/* Header: logic toggle */}
      <Stack direction="row" align="center" spacing="2" className="mb-2">
        <Button
          variant="outline"
          size="xs"
          className="gap-1 px-2 font-semibold"
          onClick={toggleLogic}
          title="Click to toggle AND / OR"
        >
          <span className={group.logic === 'and' ? 'text-primary' : 'text-muted-foreground'}>
            AND
          </span>
          <span className="text-muted-foreground">/</span>
          <span className={group.logic === 'or' ? 'text-primary' : 'text-muted-foreground'}>
            OR
          </span>
        </Button>
        <span className="text-muted-foreground text-xs">
          {group.logic === 'and' ? 'All conditions must match' : 'Any condition must match'}
        </span>
      </Stack>

      {/* Conditions */}
      <Stack spacing="1">
        {group.conditions.map((node) => {
          if (isFilterCondition(node)) {
            return (
              <FilterConditionRow
                key={node.id}
                condition={node}
                users={users}
                tags={tags}
                cardTypes={cardTypes}
                customProperties={customProperties}
                onChange={handleConditionChange}
                onRemove={() => handleRemoveNode(node.id)}
                disableRemove={group.conditions.length <= 1 && isRoot}
              />
            );
          }

          if (isFilterGroup(node)) {
            return (
              <div key={node.id} className="relative">
                <FilterBuilder
                  group={node}
                  onChange={handleGroupChange}
                  users={users}
                  tags={tags}
                  cardTypes={cardTypes}
                  customProperties={customProperties}
                  depth={depth + 1}
                />
                {group.conditions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="bg-destructive/10 text-destructive hover:bg-destructive/20 absolute -top-1.5 -right-1.5 rounded-full"
                    onClick={() => handleRemoveNode(node.id)}
                    aria-label="Remove group"
                  >
                    <Trash2 size={10} />
                  </Button>
                )}
              </div>
            );
          }

          return null;
        })}
      </Stack>

      {/* Footer: add condition / add sub-group */}
      <Stack direction="row" align="center" spacing="2" className="mt-2">
        {isRoot ? (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground gap-1 px-2"
            onClick={addSubGroup}
          >
            <Plus size={11} />
            Add condition group
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground gap-1 px-2"
              onClick={addCondition}
            >
              <Plus size={11} />
              Add condition
            </Button>
            {depth < 2 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground gap-1 px-2"
                onClick={addSubGroup}
              >
                <Plus size={11} />
                Add group
              </Button>
            )}
          </>
        )}
      </Stack>
    </div>
  );
}
