/**
 * FiltersPanel Component
 *
 * Provides interactive filter controls for Kaiten tasks:
 * - Space selection dropdown
 * - Board selection dropdown
 * - Column multi-select checkboxes
 * - User filtering options (assignee, participant)
 * - Filter logic selection (AND/OR)
 *
 * Connects to filterStore for state management and uses React Query hooks for data fetching.
 */

import { useSettings } from '@/hooks/useSettings';
import { useSpaces, useBoards, useColumns } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

/**
 * FiltersPanel displays all available filter controls
 *
 * Features:
 * - Cascading dropdowns (space -> board -> columns)
 * - Multi-select columns with checkboxes
 * - User-based filtering options
 * - Loading states for data fetching
 * - Error handling with user-friendly messages
 */
export function FiltersPanel() {
  const settings = useSettings();
  const config = { serverUrl: settings.serverUrl, apiToken: settings.apiToken };

  // Filter state from Zustand store
  const selectedSpaceId = useFilterStore((state) => state.selectedSpaceId);
  const selectedBoardId = useFilterStore((state) => state.selectedBoardId);
  const selectedColumnIds = useFilterStore((state) => state.selectedColumnIds);
  const filterByAssignee = useFilterStore((state) => state.filterByAssignee);
  const filterByParticipant = useFilterStore((state) => state.filterByParticipant);
  const filterLogic = useFilterStore((state) => state.filterLogic);

  // Filter actions from Zustand store
  const setSelectedSpace = useFilterStore((state) => state.setSelectedSpace);
  const setSelectedBoard = useFilterStore((state) => state.setSelectedBoard);
  const toggleColumn = useFilterStore((state) => state.toggleColumn);
  const setFilterByAssignee = useFilterStore((state) => state.setFilterByAssignee);
  const setFilterByParticipant = useFilterStore((state) => state.setFilterByParticipant);
  const setFilterLogic = useFilterStore((state) => state.setFilterLogic);

  // Fetch data using React Query hooks
  const { data: spaces, isLoading: spacesLoading, error: spacesError } = useSpaces(config);
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useBoards(config, selectedSpaceId);
  const { data: columns, isLoading: columnsLoading, error: columnsError } = useColumns(config, selectedBoardId);

  // Check if API is configured
  const isConfigured = !!(settings.apiToken && settings.serverUrl);

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
            <select
              value={selectedSpaceId ?? ''}
              onChange={(e) => setSelectedSpace(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a space</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
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
              <select
                value={selectedBoardId ?? ''}
                onChange={(e) => setSelectedBoard(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a board</option>
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
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
                  <label
                    key={column.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumnIds.includes(column.id)}
                      onChange={() => toggleColumn(column.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <span className="text-sm flex-1">{column.name}</span>
                  </label>
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
          {/* Filter by Assignee */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterByAssignee}
              onChange={(e) => setFilterByAssignee(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
            <span className="text-sm">Filter by Assignee</span>
          </label>

          {/* Filter by Participant */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterByParticipant}
              onChange={(e) => setFilterByParticipant(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
            <span className="text-sm">Filter by Participant</span>
          </label>

          {/* Filter Logic (AND/OR) */}
          {(filterByAssignee || filterByParticipant) && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Filter Logic</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filterLogic"
                      value="AND"
                      checked={filterLogic === 'AND'}
                      onChange={() => setFilterLogic('AND')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <span className="text-sm">AND (match all)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filterLogic"
                      value="OR"
                      checked={filterLogic === 'OR'}
                      onChange={() => setFilterLogic('OR')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <span className="text-sm">OR (match any)</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
