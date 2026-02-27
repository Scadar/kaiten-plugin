import { useState } from 'react';
import { Plus, Check, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type SavedFilter,
  type FilterGroup,
  createRootGroup,
} from '@/lib/advancedFilters';
import { useTags, useCardTypes, useColumns, useCustomPropertiesWithValues } from '@/hooks/useKaitenQuery';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stack } from '@/components/ui/stack';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FilterBuilder } from './FilterBuilder';
import type { User, Board } from '@/api/types';

interface FilterConfigModalProps {
  open: boolean;
  onClose: () => void;
  savedFilters: SavedFilter[];
  activeFilterId: string | null;
  onSetActiveFilter: (id: string | null) => void;
  onAddFilter: (filter: SavedFilter) => void;
  onUpdateFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (id: string) => void;
  users: User[];
  boards: Board[];
  spaceId: number | null;
}

type EditingState =
  | { mode: 'none' }
  | { mode: 'new' }
  | { mode: 'edit'; filterId: string };

export function FilterConfigModal({
  open,
  onClose,
  savedFilters,
  activeFilterId,
  onSetActiveFilter,
  onAddFilter,
  onUpdateFilter,
  onDeleteFilter,
  users,
  boards,
  spaceId,
}: FilterConfigModalProps) {
  const [editing, setEditing] = useState<EditingState>({ mode: 'none' });

  const [draftName,       setDraftName]       = useState('');
  const [draftBoardId,    setDraftBoardId]     = useState<number | null>(null);
  const [draftColumnIds,  setDraftColumnIds]   = useState<number[]>([]);
  const [draftNoGrouping, setDraftNoGrouping]  = useState(false);
  const [draftGroup,      setDraftGroup]       = useState<FilterGroup>(createRootGroup);

  const { data: tags        = [] } = useTags(spaceId);
  const { data: cardTypes   = [] } = useCardTypes(spaceId);
  const { data: boardColumns = [] } = useColumns(draftBoardId);
  const { data: customProperties = [] } = useCustomPropertiesWithValues();

  function startNew() {
    setDraftName('New filter');
    setDraftBoardId(null);
    setDraftColumnIds([]);
    setDraftNoGrouping(false);
    setDraftGroup(createRootGroup());
    setEditing({ mode: 'new' });
  }

  function startEdit(filter: SavedFilter) {
    setDraftName(filter.name);
    setDraftBoardId(filter.boardId ?? null);
    setDraftColumnIds(filter.columnIds ?? []);
    setDraftNoGrouping(filter.noGrouping ?? false);
    setDraftGroup(structuredClone(filter.group));
    setEditing({ mode: 'edit', filterId: filter.id });
  }

  function cancelEdit() {
    setEditing({ mode: 'none' });
  }

  function saveDraft() {
    const trimmed = draftName.trim() || 'Untitled filter';
    const base = {
      name:       trimmed,
      boardId:    draftBoardId,
      columnIds:  draftColumnIds.length > 0 ? draftColumnIds : undefined,
      noGrouping: draftNoGrouping || undefined,
      group:      draftGroup,
    };

    if (editing.mode === 'new') {
      const newFilter: SavedFilter = { id: crypto.randomUUID(), ...base };
      onAddFilter(newFilter);
      onSetActiveFilter(newFilter.id);
      setEditing({ mode: 'none' });
    } else if (editing.mode === 'edit') {
      onUpdateFilter({ id: editing.filterId, ...base });
      setEditing({ mode: 'none' });
    }
  }

  function handleDelete(id: string) {
    if (editing.mode === 'edit' && editing.filterId === id) {
      setEditing({ mode: 'none' });
    }
    onDeleteFilter(id);
  }

  const isEditing    = editing.mode !== 'none';
  const editingFilter =
    editing.mode === 'edit'
      ? savedFilters.find((f) => f.id === editing.filterId)
      : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">Filter settings</DialogTitle>
        </DialogHeader>

        <Stack direction="row" className="flex-1 overflow-hidden">
          {/* ── Left sidebar: list of saved filters (hidden while editing) ── */}
          {!isEditing && (
            <Stack className="w-full border-border overflow-hidden">
              <div className="flex-1 overflow-y-auto py-1">
                {savedFilters.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No saved filters</p>
                )}

                {savedFilters.map((f) => {
                  const isActive = f.id === activeFilterId;

                  return (
                    <Stack
                      key={f.id}
                      direction="row"
                      align="center"
                      spacing="1"
                      className="group px-2 py-1.5 rounded-sm mx-1 cursor-pointer transition-colors hover:bg-accent/50"
                    >
                      {/* Active toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'shrink-0 h-4 w-4 rounded border p-0 transition-colors',
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border-border hover:border-primary/60'
                        )}
                        onClick={() => onSetActiveFilter(isActive ? null : f.id)}
                        title={isActive ? 'Deactivate filter' : 'Activate filter'}
                      >
                        {isActive && <Check size={10} />}
                      </Button>

                      <span
                        className="flex-1 min-w-0 truncate text-xs"
                        onClick={() => startEdit(f)}
                      >
                        {f.name}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5"
                        onClick={() => startEdit(f)}
                        title="Edit filter"
                      >
                        <Pencil size={11} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 hover:text-destructive"
                        onClick={() => handleDelete(f.id)}
                        title="Delete filter"
                      >
                        <Trash2 size={11} />
                      </Button>
                    </Stack>
                  );
                })}
              </div>

              <div className="shrink-0 border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="xs"
                  className="w-full justify-center gap-1 text-muted-foreground"
                  onClick={startNew}
                >
                  <Plus size={12} />
                  Add filter
                </Button>
              </div>
            </Stack>
          )}

          {/* ── Editor panel: full width when editing ── */}
          {isEditing && (
            <Stack className="flex-1 overflow-hidden">
              <Stack spacing="4" className="flex-1 overflow-y-auto p-4">
                {/* Back button */}
                <Stack direction="row" align="center" spacing="2">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="gap-1 px-2 -ml-1 text-muted-foreground"
                    onClick={cancelEdit}
                  >
                    <ArrowLeft size={12} />
                    Back
                  </Button>
                </Stack>

                {/* Name */}
                <Stack spacing="1">
                  <Label className="text-xs font-medium">Filter name</Label>
                  <Input
                    size="sm"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="My filter…"
                    autoFocus
                  />
                </Stack>

                {/* Board scope */}
                <Stack spacing="1">
                  <Label className="text-xs font-medium">
                    Board{' '}
                    <span className="font-normal text-muted-foreground">(optional — enables Kanban view)</span>
                  </Label>
                  <ComboboxSelect
                    options={boards.map((b) => ({ value: String(b.id), label: b.name }))}
                    value={draftBoardId !== null ? String(draftBoardId) : null}
                    onChange={(val) => {
                      setDraftBoardId(val ? Number(val) : null);
                      setDraftColumnIds([]);
                    }}
                    placeholder="All boards (no Kanban)"
                    searchPlaceholder="Search boards…"
                    emptyText="No boards found."
                    className="h-7 text-xs"
                  />
                </Stack>

                {/* Column filter */}
                {draftBoardId !== null && (
                  <Stack spacing="1">
                    <Label className="text-xs font-medium">
                      Columns{' '}
                      <span className="font-normal text-muted-foreground">(optional — limits visible columns)</span>
                    </Label>
                    <MultiCombobox
                      options={boardColumns
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((c) => ({ value: String(c.id), label: c.name }))}
                      value={draftColumnIds.map(String)}
                      onChange={(vals) => setDraftColumnIds(vals.map(Number))}
                      placeholder="All columns…"
                      searchPlaceholder="Search columns…"
                      emptyText="No columns found."
                      className="h-7 text-xs"
                    />
                  </Stack>
                )}

                {/* No grouping */}
                <Stack direction="row" align="center" spacing="2">
                  <Checkbox
                    id="draft-no-grouping"
                    checked={draftNoGrouping}
                    onCheckedChange={(checked) => setDraftNoGrouping(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="draft-no-grouping" className="text-xs font-normal cursor-pointer">
                    Без группировки (flat list)
                  </Label>
                </Stack>

                {/* Conditions */}
                <Stack spacing="1">
                  <Label className="text-xs font-medium">Conditions</Label>
                  <FilterBuilder
                    group={draftGroup}
                    onChange={setDraftGroup}
                    users={users}
                    tags={tags}
                    cardTypes={cardTypes}
                    customProperties={customProperties}
                  />
                </Stack>

                {/* Footer actions */}
                <Stack direction="row" justify="end" spacing="2" className="pt-1">
                  {editing.mode === 'edit' && editingFilter && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(editingFilter.id)}
                    >
                      <Trash2 size={12} className="mr-1" />
                      Delete
                    </Button>
                  )}
                  <Button size="xs" onClick={saveDraft}>
                    {editing.mode === 'new' ? 'Create filter' : 'Save changes'}
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
