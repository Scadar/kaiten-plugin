import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSpaces, useBoards } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import type { Space, Board } from '@/api/types';

/**
 * Boards route - dedicated board selection view.
 *
 * This route displays all spaces and their boards, allowing users to:
 * - Browse all available spaces and boards
 * - Select a board (which updates filterStore)
 * - Search for boards by name
 * - View which board is currently selected
 *
 * The path '/boards' is inferred from the filename 'boards.tsx' in file-based routing.
 */
export const Route = createFileRoute('/boards')({
  component: BoardsComponent,
});

function BoardsComponent() {
  const [searchText, setSearchText] = useState('');

  // Get settings
  const settings = useSettings();
  const config = { serverUrl: settings.serverUrl, apiToken: settings.apiToken };

  const selectedBoardId = useFilterStore((state) => state.selectedBoardId);
  const setSelectedBoard = useFilterStore((state) => state.setSelectedBoard);

  // Fetch spaces
  const { data: spaces, isLoading: spacesLoading, error: spacesError } = useSpaces(config);

  // Check if API is configured
  const isConfigured = !!(settings.apiToken && settings.serverUrl);

  return (
    <Layout
      sidebar={<Sidebar />}
      toolbar={<Toolbar searchText={searchText} onSearchChange={setSearchText} />}
    >
      <div className="p-6">
        {!isConfigured ? (
          <div className="flex items-center justify-center p-8">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Setup Required</CardTitle>
                <CardDescription>Configure Kaiten API settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Please configure your API token and server URL in{' '}
                  <span className="font-medium">Settings → Tools → Kaiten</span>
                </p>
              </CardContent>
            </Card>
          </div>
        ) : spacesLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Loading spaces and boards...</p>
          </div>
        ) : spacesError ? (
          <div className="flex items-center justify-center p-8">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive">Error Loading Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{spacesError.message}</p>
              </CardContent>
            </Card>
          </div>
        ) : !spaces || spaces.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No spaces available</p>
          </div>
        ) : (
          <div className="space-y-8">
            {spaces.map((space) => (
              <SpaceSection
                key={space.id}
                space={space}
                config={config}
                searchText={searchText}
                selectedBoardId={selectedBoardId}
                onSelectBoard={setSelectedBoard}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

interface SpaceSectionProps {
  space: Space;
  config: { serverUrl: string; apiToken: string };
  searchText: string;
  selectedBoardId: number | null;
  onSelectBoard: (boardId: number | null) => void;
}

function SpaceSection({ space, config, searchText, selectedBoardId, onSelectBoard }: SpaceSectionProps) {
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useBoards(config, space.id);

  // Filter boards by search text
  const filteredBoards = boards?.filter((board) =>
    board.name.toLowerCase().includes(searchText.toLowerCase())
  ) || [];

  // Don't show space if no boards match search
  if (searchText && filteredBoards.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{space.name}</h2>
      {boardsLoading ? (
        <p className="text-sm text-muted-foreground">Loading boards...</p>
      ) : boardsError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Failed to load boards</p>
            <p className="text-xs text-muted-foreground mt-1">{boardsError.message}</p>
          </CardContent>
        </Card>
      ) : filteredBoards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No boards available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              isSelected={board.id === selectedBoardId}
              onSelect={() => onSelectBoard(board.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BoardCardProps {
  board: Board;
  isSelected: boolean;
  onSelect: () => void;
}

function BoardCard({ board, isSelected, onSelect }: BoardCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-primary ring-2 ring-primary ring-opacity-50' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{board.name}</CardTitle>
          {isSelected && (
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

interface ToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
}

function Toolbar({ searchText, onSearchChange }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2">
      <Button variant="ghost" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button variant="ghost" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>

      {/* Search */}
      <div className="ml-4 flex-1">
        <Input
          placeholder="Search boards by name..."
          className="max-w-md"
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="p-4 space-y-6">
      {/* Navigation */}
      <div>
        <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">Navigation</h2>
        <Navigation />
      </div>

      {/* Filters Section */}
      <FiltersPanel />
    </div>
  );
}
