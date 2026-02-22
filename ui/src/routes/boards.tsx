import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useSettingsStatus } from '@/hooks/useSettings';
import { useSpaces, useBoards } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Space, Board } from '@/api/types';

export const Route = createFileRoute('/boards')({
  component: BoardsComponent,
});

function BoardsComponent() {
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { isConfigured } = useSettingsStatus();
  const selectedBoardId = useFilterStore((s) => s.selectedBoardId);
  const setSelectedBoard = useFilterStore((s) => s.setSelectedBoard);

  const { data: spaces, isLoading: spacesLoading, error: spacesError, refetch } = useSpaces();

  return (
    <Layout
      header={
        <>
          <span className="flex-1 text-xs font-medium text-muted-foreground">Boards</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowSearch((v) => !v)}
              >
                <Search size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
                <RefreshCw size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Refresh</TooltipContent>
          </Tooltip>
        </>
      }
    >
      {/* Search */}
      {showSearch && (
        <div className="border-b border-border px-2 py-1.5">
          <Input
            autoFocus
            placeholder="Search boards..."
            className="h-7 text-xs"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {!isConfigured ? (
        <div className="px-3 py-4">
          <p className="text-xs text-muted-foreground">
            Configure API settings in{' '}
            <span className="font-medium text-foreground">Settings</span> to view boards.
          </p>
        </div>
      ) : spacesLoading ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      ) : spacesError ? (
        <div className="px-3 py-3">
          <p className="text-xs text-destructive">{spacesError.message}</p>
        </div>
      ) : !spaces?.length ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">No spaces available</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {spaces.map((space) => (
            <SpaceSection
              key={space.id}
              space={space}
              searchText={searchText}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoard}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

interface SpaceSectionProps {
  space: Space;
  searchText: string;
  selectedBoardId: number | null;
  onSelectBoard: (id: number | null) => void;
}

function SpaceSection({ space, searchText, selectedBoardId, onSelectBoard }: SpaceSectionProps) {
  const { data: boards, isLoading } = useBoards(space.id);

  const filtered = boards?.filter((b) =>
    b.name.toLowerCase().includes(searchText.toLowerCase())
  ) ?? [];

  if (searchText && filtered.length === 0) return null;

  return (
    <Collapsible defaultOpen className="group/space">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-1.5 hover:bg-accent/40 transition-colors">
        <ChevronRight
          size={11}
          className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/space:rotate-90"
        />
        <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {space.name}
        </span>
        {boards && (
          <span className="text-[10px] text-muted-foreground">{filtered.length}</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isLoading ? (
          <div className="px-3 py-1.5">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-1.5">
            <p className="text-xs text-muted-foreground">No boards</p>
          </div>
        ) : (
          <div className="pb-1">
            {filtered.map((board) => (
              <BoardRow
                key={board.id}
                board={board}
                isSelected={board.id === selectedBoardId}
                onSelect={() =>
                  onSelectBoard(board.id === selectedBoardId ? null : board.id)
                }
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface BoardRowProps {
  board: Board;
  isSelected: boolean;
  onSelect: () => void;
}

function BoardRow({ board, isSelected, onSelect }: BoardRowProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 px-6 py-1.5 text-left transition-colors',
        'hover:bg-accent/40',
        isSelected && 'bg-accent/60 text-accent-foreground'
      )}
    >
      <span className="flex-1 truncate text-[13px]">{board.name}</span>
      {isSelected && (
        <CheckCircle2 size={13} className="shrink-0 text-primary" />
      )}
    </button>
  );
}
