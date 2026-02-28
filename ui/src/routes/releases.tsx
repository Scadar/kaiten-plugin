import { useState, useMemo, useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  Check,
  ExternalLink,
  GitBranch,
  Loader2,
  PackageSearch,
  Settings,
  Star,
  X,
} from 'lucide-react';

import { settingsKeys } from '@/api/endpoints';
import type { Task, KaitenSettings } from '@/api/types';
import { bridge } from '@/bridge/JCEFBridge';
import { Layout } from '@/components/Layout';
import { ReleasesFiltersPanel } from '@/components/ReleasesFiltersPanel';
import { CardsTable } from '@/components/tasks/CardsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import {
  useColumns,
  useTasksBySpace,
  useCardDetail,
  useChildCards,
  useCheckBranchesMerged,
} from '@/hooks/useKaitenQuery';
import { useSettings } from '@/hooks/useSettings';
import { buildKaitenUrl } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useActiveReleaseFilter } from '@/state/releaseFilterStore';
import { useUIStore } from '@/state/uiStore';

export const Route = createFileRoute('/releases')({
  component: ReleasesComponent,
});

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'list' | 'active';

// ── Root component ────────────────────────────────────────────────────────────

function ReleasesComponent() {
  const activeTab = useUIStore((s) => s.releasesActiveTab);
  const setActiveTab = useUIStore((s) => s.setReleasesActiveTab);

  const settings = useSettings();

  const releaseFiltersConfigured =
    settings.releaseSpaceId !== null && settings.releaseBoardId !== null;

  return (
    <Layout
      header={
        <ReleasesToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeReleaseCardId={settings.activeReleaseCardId}
        />
      }
    >
      {activeTab === 'list' ? (
        <ReleasesListTab settings={settings} releaseFiltersConfigured={releaseFiltersConfigured} />
      ) : (
        <ActiveReleaseTab settings={settings} releaseFiltersConfigured={releaseFiltersConfigured} />
      )}
    </Layout>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ReleasesToolbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  activeReleaseCardId: number | null;
}

function ReleasesToolbar({ activeTab, onTabChange, activeReleaseCardId }: ReleasesToolbarProps) {
  return (
    <Stack direction="row" align="center" spacing="1" className="w-full">
      <button
        onClick={() => onTabChange('list')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          activeTab === 'list'
            ? 'bg-primary/[0.12] text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <PackageSearch size={13} />
        Releases
      </button>

      <button
        onClick={() => onTabChange('active')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          activeTab === 'active'
            ? 'bg-primary/[0.12] text-primary'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <Star size={13} />
        Active release
        {activeReleaseCardId !== null && (
          <Badge variant="secondary" size="xs" className="ml-0.5 text-[10px] font-normal">
            #{activeReleaseCardId}
          </Badge>
        )}
      </button>
    </Stack>
  );
}

// ── No-filters banner ─────────────────────────────────────────────────────────

function NoFiltersNotice() {
  return (
    <Card variant="island" padding="md" className="my-3 text-center">
      <Stack align="center" spacing="2">
        <Text variant="dimmed">Release filters are not configured.</Text>
        <Link to="/settings">
          <Button variant="outline" size="xs">
            <Settings size={12} />
            Open Settings
          </Button>
        </Link>
      </Stack>
    </Card>
  );
}

// ── Releases list tab ─────────────────────────────────────────────────────────

interface ReleasesListTabProps {
  settings: KaitenSettings;
  releaseFiltersConfigured: boolean;
}

function ReleasesListTab({ settings, releaseFiltersConfigured }: ReleasesListTabProps) {
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { releaseBoardId, releaseColumnIds, releaseSpaceId, activeReleaseCardId } = settings;

  // Fetch tasks — column_ids are sent as query params, boardId filtered client-side
  const {
    data: tasks,
    isLoading,
    error,
  } = useTasksBySpace({
    spaceId: releaseSpaceId,
    boardId: releaseBoardId,
    columnIds: releaseColumnIds.length > 0 ? releaseColumnIds : null,
  });

  // Fetch columns for the release board
  const { data: columns } = useColumns(releaseBoardId);

  // Client-side search filter only (column filtering is server-side)
  const filteredTasks = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return tasks ?? [];
    return (tasks ?? []).filter(
      (t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q),
    );
  }, [tasks, searchText]);

  const columnMap = useMemo(() => {
    const map: Record<number, string> = {};
    (columns ?? []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [columns]);

  const handleSetActive = useCallback(
    async (cardId: number) => {
      const newId = activeReleaseCardId === cardId ? null : cardId;
      await bridge.call('updateSettings', {
        settings: { ...settings, activeReleaseCardId: newId },
      });
      await queryClient.invalidateQueries({ queryKey: settingsKeys.all() });
    },
    [activeReleaseCardId, settings, queryClient],
  );

  if (!releaseFiltersConfigured) {
    return <NoFiltersNotice />;
  }

  const activeStarColumn: ColumnDef<Task> = {
    id: 'active',
    enableHiding: false,
    enableSorting: false,
    header: () => (
      <span title="Mark as active release">
        <Star size={11} className="text-muted-foreground/50" />
      </span>
    ),
    cell: ({ row }) => {
      const isActive = row.original.id === activeReleaseCardId;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void handleSetActive(row.original.id);
          }}
          title={isActive ? 'Remove as active release' : 'Set as active release'}
          className={cn(
            'flex items-center justify-center transition-colors',
            isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-primary opacity-20 group-hover/row:opacity-60 hover:!opacity-100',
          )}
        >
          {isActive ? <Star size={12} fill="currentColor" /> : <Star size={12} />}
        </button>
      );
    },
    size: 28,
  };

  const actionsColumn: ColumnDef<Task> = {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    header: undefined,
    cell: ({ row }) => {
      const url = buildKaitenUrl(settings.serverUrl, releaseSpaceId, row.original.id);
      if (!url) return null;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-primary opacity-0 transition-all group-hover/row:opacity-100"
          title="Open in Kaiten"
        >
          <ExternalLink size={11} />
        </a>
      );
    },
    size: 24,
  };

  return (
    <div className="pt-2 pb-2">
      <div className="mb-2 px-2">
        <Input
          size="sm"
          placeholder="Search releases…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Stack align="center" justify="center" className="py-8">
          <Text variant="secondary">Loading releases…</Text>
        </Stack>
      ) : error ? (
        <Card variant="island" padding="sm">
          <Text variant="secondary" className="text-destructive">
            {error.message}
          </Text>
        </Card>
      ) : (
        <Card variant="island">
          <CardsTable
            tasks={filteredTasks}
            columnMap={columnMap}
            columns={[
              activeStarColumn,
              'id',
              'title',
              'column',
              'responsible',
              'members',
              actionsColumn,
            ]}
            onRowClick={(id) => navigate({ to: '/card/$cardId', params: { cardId: String(id) } })}
            emptyMessage="No releases found"
          />
        </Card>
      )}
    </div>
  );
}

// ── Active release tab ────────────────────────────────────────────────────────

interface ActiveReleaseTabProps {
  settings: KaitenSettings;
  releaseFiltersConfigured: boolean;
}

function ActiveReleaseTab({ settings, releaseFiltersConfigured }: ActiveReleaseTabProps) {
  const { activeReleaseCardId, releaseSpaceId } = settings;

  if (!releaseFiltersConfigured) {
    return <NoFiltersNotice />;
  }

  if (activeReleaseCardId === null) {
    return (
      <Card variant="island" padding="md" className="my-3 text-center">
        <Stack align="center" spacing="1">
          <Text variant="dimmed">No active release selected.</Text>
          <Text variant="dimmed">
            Go to the <strong>Releases</strong> tab and click the star icon on a card.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <ActiveReleaseContent
      cardId={activeReleaseCardId}
      serverUrl={settings.serverUrl}
      releaseSpaceId={releaseSpaceId}
      branchPatterns={settings.branchPatterns}
    />
  );
}

// ── Active release content ────────────────────────────────────────────────────

interface ActiveReleaseContentProps {
  cardId: number;
  serverUrl: string;
  releaseSpaceId: number | null;
  branchPatterns: string[];
}

function ActiveReleaseContent({
  cardId,
  serverUrl,
  releaseSpaceId,
  branchPatterns,
}: ActiveReleaseContentProps) {
  const [childSearch, setChildSearch] = useState('');
  const [releaseBranchInput, setReleaseBranchInput] = useState('');
  const navigate = useNavigate();
  const [releaseBranch, setReleaseBranch] = useState<string | null>(null);

  const activeFilter = useActiveReleaseFilter();

  const { data: task, isLoading: taskLoading, error: taskError } = useCardDetail(cardId);
  const { data: columns } = useColumns(task?.boardId ?? null);

  const { data: childTasks, isLoading: childrenLoading } = useChildCards(
    task?.childrenIds,
    activeFilter,
  );

  // Generate all candidate branch names (every pattern × every task), so the query key
  // stays stable when the user types in the search box.
  const taskBranches = useMemo(
    () =>
      (childTasks ?? []).flatMap((t) => branchPatterns.map((p) => p.replace('{id}', String(t.id)))),
    [childTasks, branchPatterns],
  );

  const {
    data: branchResults,
    isLoading: branchesLoading,
    error: branchesError,
    refetch: refetchBranches,
  } = useCheckBranchesMerged(releaseBranch, taskBranches);

  const columnMap = useMemo(() => {
    const map: Record<number, string> = {};
    (columns ?? []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [columns]);

  const kaitenUrl = buildKaitenUrl(serverUrl, releaseSpaceId, cardId);

  const filteredChildren = useMemo(() => {
    let result = childTasks ?? [];

    // Apply client-side column filter if set in the active release filter
    const columnIds = activeFilter?.columnIds;
    if (columnIds && columnIds.length > 0) {
      result = result.filter((t) => columnIds.includes(t.columnId));
    }

    const q = childSearch.trim().toLowerCase();
    if (!q) return result;
    return result.filter((t) => t.title.toLowerCase().includes(q) || String(t.id).includes(q));
  }, [childTasks, childSearch, activeFilter]);

  if (taskLoading) {
    return (
      <Stack align="center" justify="center" className="py-8">
        <Text variant="secondary">Loading release…</Text>
      </Stack>
    );
  }

  if (taskError || !task) {
    return (
      <div className="px-3 py-4">
        <Text variant="secondary" className="text-destructive">
          {taskError?.message ?? 'Failed to load release card'}
        </Text>
      </div>
    );
  }

  const columnName = columnMap[task.columnId];
  const conditionLabel = task.condition !== null ? CONDITION_LABELS[task.condition] : null;

  // ── Child table — custom columns ─────────────────────────────────────────────

  const branchStatusColumn: ColumnDef<Task> = {
    id: 'branchStatus',
    enableHiding: false,
    enableSorting: false,
    header: () => <GitBranch size={12} className="text-muted-foreground" />,
    cell: ({ row }) => {
      if (!releaseBranch) {
        return <span className="text-muted-foreground text-xs opacity-30">—</span>;
      }
      if (branchesLoading) {
        return <span className="text-muted-foreground text-xs opacity-40">…</span>;
      }
      if (branchesError) {
        return (
          <AlertCircle
            size={12}
            className="text-destructive opacity-60"
            aria-label={branchesError.message}
          />
        );
      }
      const candidates = branchPatterns.map((p) => p.replace('{id}', String(row.original.id)));
      const matchedBranch = candidates.find((b) => branchResults?.[b] === true);
      return matchedBranch ? (
        <Check
          size={12}
          className="text-green-500"
          aria-label={`${matchedBranch} is in the release branch`}
        />
      ) : (
        <X
          size={12}
          className="text-muted-foreground opacity-50"
          aria-label={`Not found: ${candidates.join(', ')}`}
        />
      );
    },
    size: 36,
  };

  const childActionsColumn: ColumnDef<Task> = {
    id: 'actions',
    enableHiding: false,
    enableSorting: false,
    header: undefined,
    cell: ({ row }) => {
      const url = buildKaitenUrl(serverUrl, releaseSpaceId, row.original.id);
      if (!url) return null;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-primary opacity-0 transition-all group-hover/row:opacity-100"
          title="Open in Kaiten"
        >
          <ExternalLink size={11} />
        </a>
      );
    },
    size: 24,
  };

  return (
    <>
      <Stack spacing="0">
        {/* ── Filter panel ── */}
        <ReleasesFiltersPanel spaceId={releaseSpaceId} />

        {/* ── Release card summary ── */}
        <Card variant="island" padding="md" className="mt-2">
          <Stack spacing="2">
            <Stack direction="row" align="start" spacing="2">
              <Stack className="min-w-0 flex-1" spacing="0">
                <Stack direction="row" align="center" wrap="wrap" spacing="2" className="mb-1">
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    #{task.id}
                  </span>
                  {columnName && (
                    <Badge variant="secondary" size="xs" className="font-normal">
                      {columnName}
                    </Badge>
                  )}
                  {conditionLabel && (
                    <Badge variant="outline" size="xs" className="font-normal">
                      {conditionLabel}
                    </Badge>
                  )}
                  {task.blocked && (
                    <Badge variant="destructive" size="xs" className="font-normal">
                      Blocked
                    </Badge>
                  )}
                </Stack>
                <p className="text-sm leading-snug font-semibold">{task.title}</p>
              </Stack>

              {kaitenUrl && (
                <a
                  href={kaitenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary shrink-0 text-xs transition-colors"
                  title="Open in Kaiten"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </Stack>

            {task.dueDate && (
              <Text variant="dimmed">Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
            )}

            {task.tags.length > 0 && (
              <Stack direction="row" wrap="wrap" spacing="1">
                {task.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    size="xs"
                    className="font-normal"
                    style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>

        {/* ── Release branch check ── */}
        <Card variant="island" padding="md">
          <Stack spacing="1.5">
            <Stack direction="row" align="center" spacing="1.5">
              <GitBranch size={13} className="text-muted-foreground shrink-0" />
              <Text variant="overline">Release branch</Text>
            </Stack>
            <Stack direction="row" align="center" spacing="1">
              <Input
                size="sm"
                placeholder={`e.g. release/v1.0.0`}
                value={releaseBranchInput}
                onChange={(e) => setReleaseBranchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setReleaseBranch(releaseBranchInput.trim() || null);
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  const branch = releaseBranchInput.trim() || null;
                  if (branch === releaseBranch) {
                    void refetchBranches();
                  } else {
                    setReleaseBranch(branch);
                  }
                }}
                disabled={branchesLoading}
              >
                {branchesLoading ? <Loader2 size={12} className="animate-spin" /> : 'Check'}
              </Button>
            </Stack>
            {branchesError && (
              <Stack direction="row" align="center" spacing="1">
                <AlertCircle size={12} className="text-destructive shrink-0" />
                <Text variant="dimmed" className="text-destructive">
                  {branchesError.message}
                </Text>
              </Stack>
            )}
            {releaseBranch && !branchesLoading && !branchesError && branchResults && (
              <Text variant="dimmed" className="text-muted-foreground">
                {
                  (childTasks ?? []).filter((t) =>
                    branchPatterns.some((p) => branchResults[p.replace('{id}', String(t.id))]),
                  ).length
                }{' '}
                / {(childTasks ?? []).length} tasks added to{' '}
                <span className="font-mono">{releaseBranch}</span>
              </Text>
            )}
          </Stack>
        </Card>

        {/* ── Children table ── */}
        <div className="px-3 pb-0.5">
          <Text variant="overline">
            Child cards
            {childTasks !== undefined && (
              <span className="text-muted-foreground ml-1.5 font-normal normal-case">
                ({filteredChildren.length})
              </span>
            )}
          </Text>
        </div>

        <div className="mb-2 px-2">
          <Input
            size="sm"
            placeholder="Search child cards…"
            value={childSearch}
            onChange={(e) => setChildSearch(e.target.value)}
          />
        </div>

        {childrenLoading ? (
          <Stack align="center" justify="center" className="py-6">
            <Text variant="secondary">Loading child cards…</Text>
          </Stack>
        ) : (
          <Card variant="island">
            <CardsTable
              key={activeFilter?.id ?? 'default'}
              tasks={filteredChildren}
              columnMap={columnMap}
              columns={[
                'id',
                'title',
                branchStatusColumn,
                'responsible',
                'members',
                childActionsColumn,
              ]}
              onRowClick={(id) => navigate({ to: '/card/$cardId', params: { cardId: String(id) } })}
              emptyMessage="No child cards found"
            />
          </Card>
        )}
      </Stack>
    </>
  );
}

// ── Condition labels ──────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<number, string> = {
  1: 'Active',
  2: 'Done',
  3: 'Archived',
};
