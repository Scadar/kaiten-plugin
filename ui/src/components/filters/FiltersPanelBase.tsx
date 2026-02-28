import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useBoards, useUsers } from '@/hooks/useKaitenQuery';
import type { SavedFilter } from '@/lib/advancedFilters';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { FilterConfigModal } from '@/components/filters/FilterConfigModal';
import { cn } from '@/lib/utils';

export interface FiltersPanelBaseProps {
  savedFilters:       SavedFilter[];
  activeFilterId:     string | null;
  spaceId:            number | null;
  onSetActiveFilter:  (id: string | null) => void;
  onAddFilter:        (filter: SavedFilter) => void;
  onUpdateFilter:     (filter: SavedFilter) => void;
  onDeleteFilter:     (id: string) => void;
  className?:         string;
}

export function FiltersPanelBase({
  savedFilters,
  activeFilterId,
  spaceId,
  onSetActiveFilter,
  onAddFilter,
  onUpdateFilter,
  onDeleteFilter,
  className,
}: FiltersPanelBaseProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data: boards = [] } = useBoards(spaceId);
  const { data: users  = [] } = useUsers();

  return (
    <>
      <Card variant="island" className={className}>
        <Stack direction="row" wrap="wrap" align="center" spacing="1" className="px-2 py-1.5">
          {savedFilters.map((f) => {
            const isActive        = f.id === activeFilterId;
            const boardName       = f.boardId ? boards.find((b) => b.id === f.boardId)?.name : null;
            const hasViewSettings = f.columnIds && f.columnIds.length > 0;
            return (
              <Button
                key={f.id}
                variant={isActive ? 'default' : 'secondary'}
                size="xs"
                className={cn(
                  'rounded-full px-3 font-medium',
                  !isActive && 'border border-border'
                )}
                onClick={() => onSetActiveFilter(isActive ? null : f.id)}
                title={hasViewSettings ? `${f.columnIds?.length} column(s)` : undefined}
              >
                <Text variant="body">{f.name}</Text>
                {boardName && <Text variant="dimmed">· {boardName}</Text>}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="icon-sm"
            className="shrink-0 rounded ml-auto"
            onClick={() => setModalOpen(true)}
            title="Configure filters"
          >
            <Settings2 size={13} />
          </Button>
        </Stack>
      </Card>

      <FilterConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        savedFilters={savedFilters}
        activeFilterId={activeFilterId}
        onSetActiveFilter={onSetActiveFilter}
        onAddFilter={onAddFilter}
        onUpdateFilter={onUpdateFilter}
        onDeleteFilter={onDeleteFilter}
        users={users}
        boards={boards}
        spaceId={spaceId}
      />
    </>
  );
}
