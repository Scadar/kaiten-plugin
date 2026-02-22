import { useSettingsStatus } from '@/hooks/useSettings';
import { useSpaces, useBoards, useColumns } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/section">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-accent/40 transition-colors">
        <ChevronRight
          size={11}
          className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/section:rotate-90"
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-2.5 pt-1 space-y-2">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FiltersPanel() {
  const { isConfigured } = useSettingsStatus();

  const selectedSpaceId = useFilterStore((state) => state.selectedSpaceId);
  const selectedBoardId = useFilterStore((state) => state.selectedBoardId);
  const selectedColumnIds = useFilterStore((state) => state.selectedColumnIds);
  const filterByAssignee = useFilterStore((state) => state.filterByAssignee);
  const filterByParticipant = useFilterStore((state) => state.filterByParticipant);
  const filterLogic = useFilterStore((state) => state.filterLogic);

  const setSelectedSpace = useFilterStore((state) => state.setSelectedSpace);
  const setSelectedBoard = useFilterStore((state) => state.setSelectedBoard);
  const toggleColumn = useFilterStore((state) => state.toggleColumn);
  const setFilterByAssignee = useFilterStore((state) => state.setFilterByAssignee);
  const setFilterByParticipant = useFilterStore((state) => state.setFilterByParticipant);
  const setFilterLogic = useFilterStore((state) => state.setFilterLogic);

  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: boards, isLoading: boardsLoading } = useBoards(selectedSpaceId);
  const { data: columns, isLoading: columnsLoading } = useColumns(selectedBoardId);

  if (!isConfigured) {
    return (
      <div className="px-3 py-3 text-xs text-muted-foreground">
        Configure API settings to enable filters.
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <Collapsible defaultOpen className="group/filters">
        <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-1.5 hover:bg-accent/40 transition-colors border-b border-border">
          <SlidersHorizontal size={12} className="shrink-0 text-muted-foreground" />
          <span className="flex-1 text-xs font-medium">Filters</span>
          <ChevronRight
            size={11}
            className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/filters:rotate-90"
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* Space */}
          <FilterSection title="Space">
            {spacesLoading ? (
              <p className="text-xs text-muted-foreground">Loading...</p>
            ) : !spaces?.length ? (
              <p className="text-xs text-muted-foreground">No spaces</p>
            ) : (
              <Combobox
                options={spaces.map((s) => ({ value: String(s.id), label: s.name }))}
                value={selectedSpaceId !== null ? String(selectedSpaceId) : null}
                onChange={(val) => setSelectedSpace(val ? Number(val) : null)}
                placeholder="Select space..."
                searchPlaceholder="Search spaces..."
                emptyText="No spaces found."
              />
            )}
          </FilterSection>

          {/* Board */}
          {selectedSpaceId && (
            <FilterSection title="Board">
              {boardsLoading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : !boards?.length ? (
                <p className="text-xs text-muted-foreground">No boards</p>
              ) : (
                <Combobox
                  options={boards.map((b) => ({ value: String(b.id), label: b.name }))}
                  value={selectedBoardId !== null ? String(selectedBoardId) : null}
                  onChange={(val) => setSelectedBoard(val ? Number(val) : null)}
                  placeholder="Select board..."
                  searchPlaceholder="Search boards..."
                  emptyText="No boards found."
                />
              )}
            </FilterSection>
          )}

          {/* Columns */}
          {selectedBoardId && (
            <FilterSection title="Columns" defaultOpen={false}>
              {columnsLoading ? (
                <p className="text-xs text-muted-foreground">Loading...</p>
              ) : !columns?.length ? (
                <p className="text-xs text-muted-foreground">No columns</p>
              ) : (
                <div className="space-y-1">
                  {columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/40 cursor-pointer"
                      onClick={() => toggleColumn(col.id)}
                    >
                      <Checkbox
                        id={`col-${col.id}`}
                        checked={selectedColumnIds.includes(col.id)}
                        onCheckedChange={() => toggleColumn(col.id)}
                      />
                      <Label
                        htmlFor={`col-${col.id}`}
                        className="flex-1 text-xs font-normal cursor-pointer truncate"
                      >
                        {col.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </FilterSection>
          )}

          {/* Users */}
          <FilterSection title="Users" defaultOpen={false}>
            <div className="space-y-1.5">
              <div
                className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/40 cursor-pointer"
                onClick={() => setFilterByAssignee(!filterByAssignee)}
              >
                <Checkbox
                  id="filter-assignee"
                  checked={filterByAssignee}
                  onCheckedChange={(c) => setFilterByAssignee(c === true)}
                />
                <Label htmlFor="filter-assignee" className="text-xs font-normal cursor-pointer">
                  Assignee
                </Label>
              </div>

              <div
                className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent/40 cursor-pointer"
                onClick={() => setFilterByParticipant(!filterByParticipant)}
              >
                <Checkbox
                  id="filter-participant"
                  checked={filterByParticipant}
                  onCheckedChange={(c) => setFilterByParticipant(c === true)}
                />
                <Label htmlFor="filter-participant" className="text-xs font-normal cursor-pointer">
                  Participant
                </Label>
              </div>

              {(filterByAssignee || filterByParticipant) && (
                <>
                  <Separator className="my-1.5" />
                  <RadioGroup
                    value={filterLogic}
                    onValueChange={(val) => setFilterLogic(val as 'AND' | 'OR')}
                    className={cn('gap-1 pl-1')}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="AND" id="logic-and" />
                      <Label htmlFor="logic-and" className="text-xs font-normal cursor-pointer">
                        AND — match all
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="OR" id="logic-or" />
                      <Label htmlFor="logic-or" className="text-xs font-normal cursor-pointer">
                        OR — match any
                      </Label>
                    </div>
                  </RadioGroup>
                </>
              )}
            </div>
          </FilterSection>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
