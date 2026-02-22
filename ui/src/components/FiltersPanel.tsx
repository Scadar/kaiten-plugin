import { useSettingsStatus } from '@/hooks/useSettings';
import { useSpaces, useBoards, useColumns } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

  const { data: spaces, isLoading: spacesLoading, error: spacesError } = useSpaces();
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useBoards(selectedSpaceId);
  const { data: columns, isLoading: columnsLoading, error: columnsError } = useColumns(selectedBoardId);

  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Required</CardTitle>
          <CardDescription className="text-xs">Configure Kaiten API settings</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please configure your API token and server URL in{' '}
            <span className="font-medium">Settings → Tools → Kaiten</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Space Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Space</CardTitle>
          <CardDescription className="text-xs">Select a workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {spacesLoading ? (
            <p className="text-sm text-muted-foreground">Loading spaces...</p>
          ) : spacesError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">Failed to load spaces</p>
              <p className="text-xs text-muted-foreground">{spacesError.message}</p>
            </div>
          ) : !spaces || spaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">No spaces available</p>
          ) : (
            <Combobox
              options={spaces.map((s) => ({ value: String(s.id), label: s.name }))}
              value={selectedSpaceId !== null ? String(selectedSpaceId) : null}
              onChange={(val) => setSelectedSpace(val ? Number(val) : null)}
              placeholder="Select a space"
              searchPlaceholder="Search spaces..."
              emptyText="No spaces found."
            />
          )}
        </CardContent>
      </Card>

      {/* Board Selection */}
      {selectedSpaceId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Board</CardTitle>
            <CardDescription className="text-xs">Select a board</CardDescription>
          </CardHeader>
          <CardContent>
            {boardsLoading ? (
              <p className="text-sm text-muted-foreground">Loading boards...</p>
            ) : boardsError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Failed to load boards</p>
                <p className="text-xs text-muted-foreground">{boardsError.message}</p>
              </div>
            ) : !boards || boards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No boards available</p>
            ) : (
              <Combobox
                options={boards.map((b) => ({ value: String(b.id), label: b.name }))}
                value={selectedBoardId !== null ? String(selectedBoardId) : null}
                onChange={(val) => setSelectedBoard(val ? Number(val) : null)}
                placeholder="Select a board"
                searchPlaceholder="Search boards..."
                emptyText="No boards found."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Column Selection */}
      {selectedBoardId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Columns</CardTitle>
            <CardDescription className="text-xs">Filter by columns</CardDescription>
          </CardHeader>
          <CardContent>
            {columnsLoading ? (
              <p className="text-sm text-muted-foreground">Loading columns...</p>
            ) : columnsError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Failed to load columns</p>
                <p className="text-xs text-muted-foreground">{columnsError.message}</p>
              </div>
            ) : !columns || columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No columns available</p>
            ) : (
              <div className="space-y-2">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                    onClick={() => toggleColumn(column.id)}
                  >
                    <Checkbox
                      id={`column-${column.id}`}
                      checked={selectedColumnIds.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                    />
                    <Label
                      htmlFor={`column-${column.id}`}
                      className="flex-1 text-sm font-normal cursor-pointer"
                    >
                      {column.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Filters</CardTitle>
          <CardDescription className="text-xs">Filter by user involvement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-assignee"
              checked={filterByAssignee}
              onCheckedChange={(checked) => setFilterByAssignee(checked === true)}
            />
            <Label htmlFor="filter-assignee" className="text-sm font-normal cursor-pointer">
              Filter by Assignee
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="filter-participant"
              checked={filterByParticipant}
              onCheckedChange={(checked) => setFilterByParticipant(checked === true)}
            />
            <Label htmlFor="filter-participant" className="text-sm font-normal cursor-pointer">
              Filter by Participant
            </Label>
          </div>

          {(filterByAssignee || filterByParticipant) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Filter Logic</Label>
                <RadioGroup
                  value={filterLogic}
                  onValueChange={(val) => setFilterLogic(val as 'AND' | 'OR')}
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="AND" id="logic-and" />
                    <Label htmlFor="logic-and" className="text-sm font-normal cursor-pointer">
                      AND (match all)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="OR" id="logic-or" />
                    <Label htmlFor="logic-or" className="text-sm font-normal cursor-pointer">
                      OR (match any)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
