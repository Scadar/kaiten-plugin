import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';

import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { bridge } from '@/bridge/JCEFBridge';
import { FieldRow } from '@/components/settings/FieldRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ComboboxSelect } from '@/components/ui/combobox-select';
import { MultiCombobox } from '@/components/ui/multi-combobox';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useSpaces, useBoards, useColumns } from '@/hooks/useKaitenQuery';

export interface ReleasesSectionProps {
  currentSettings: KaitenSettings;
}

/**
 * Release settings island: space, board, and column filters for the Releases page.
 * Self-contained with its own save button due to cascading selections.
 */
export function ReleasesSection({ currentSettings }: ReleasesSectionProps) {
  const queryClient = useQueryClient();

  const [releaseSpaceId, setReleaseSpaceId] = useState<number | null>(
    currentSettings.releaseSpaceId,
  );
  const [releaseBoardId, setReleaseBoardId] = useState<number | null>(
    currentSettings.releaseBoardId,
  );
  const [releaseColumnIds, setReleaseColumnIds] = useState<number[]>(
    currentSettings.releaseColumnIds,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: boards, isLoading: boardsLoading } = useBoards(releaseSpaceId);
  const { data: columns, isLoading: columnsLoading } = useColumns(releaseBoardId);

  const spaceOptions = (spaces ?? []).map((s) => ({ value: String(s.id), label: s.name }));
  const boardOptions = (boards ?? []).map((b) => ({ value: String(b.id), label: b.name }));
  const columnOptions = (columns ?? []).map((c) => ({ value: String(c.id), label: c.name }));

  function handleSpaceChange(value: string | null) {
    setReleaseSpaceId(value ? Number(value) : null);
    setReleaseBoardId(null);
    setReleaseColumnIds([]);
  }

  function handleBoardChange(value: string | null) {
    setReleaseBoardId(value ? Number(value) : null);
    setReleaseColumnIds([]);
  }

  const sortedCurrent = [...currentSettings.releaseColumnIds].sort().join(',');
  const sortedLocal = [...releaseColumnIds].sort().join(',');
  const hasChanges =
    releaseSpaceId !== currentSettings.releaseSpaceId ||
    releaseBoardId !== currentSettings.releaseBoardId ||
    sortedLocal !== sortedCurrent;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await bridge.call('updateSettings', {
        settings: {
          ...currentSettings,
          releaseSpaceId,
          releaseBoardId,
          releaseColumnIds,
        },
      });
      await queryClient.invalidateQueries({ queryKey: settingsKeys.all() });
      setSaveStatus('success');
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="px-3 pt-3 pb-1">
        <Text variant="overline">Releases</Text>
      </div>

      <Card variant="island" padding="md">
        <Stack spacing="3">
          <FieldRow label="Space">
            <ComboboxSelect
              options={spaceOptions}
              value={releaseSpaceId !== null ? String(releaseSpaceId) : null}
              onChange={handleSpaceChange}
              placeholder={spacesLoading ? 'Loading…' : 'Select space…'}
              searchPlaceholder="Search spaces…"
              emptyText="No spaces found."
              className="h-7 text-xs"
            />
          </FieldRow>

          <FieldRow label="Board">
            <ComboboxSelect
              options={boardOptions}
              value={releaseBoardId !== null ? String(releaseBoardId) : null}
              onChange={handleBoardChange}
              placeholder={
                !releaseSpaceId
                  ? 'Select space first'
                  : boardsLoading
                    ? 'Loading…'
                    : 'Select board…'
              }
              searchPlaceholder="Search boards…"
              emptyText="No boards found."
              className="h-7 text-xs"
            />
          </FieldRow>

          <FieldRow label="Columns">
            <MultiCombobox
              options={columnOptions}
              value={releaseColumnIds.map(String)}
              onChange={(vals) => setReleaseColumnIds(vals.map(Number))}
              placeholder={
                !releaseBoardId
                  ? 'Select board first'
                  : columnsLoading
                    ? 'Loading…'
                    : 'Select columns…'
              }
              searchPlaceholder="Search columns…"
              emptyText="No columns found."
              className="h-7 text-xs"
            />
          </FieldRow>

          <Stack direction="row" align="center" spacing="3" className="pt-1">
            <Button size="xs" onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
              Save
            </Button>

            {saveStatus === 'success' && (
              <Stack
                direction="row"
                align="center"
                spacing="1"
                className="text-xs text-green-600 dark:text-green-500"
              >
                <CheckCircle2 size={12} />
                <span>Saved</span>
              </Stack>
            )}
            {saveStatus === 'error' && (
              <Stack
                direction="row"
                align="center"
                spacing="1"
                className="text-destructive text-xs"
              >
                <XCircle size={12} />
                <span>Failed</span>
              </Stack>
            )}
            {hasChanges && saveStatus === 'idle' && <Text variant="dimmed">Unsaved changes</Text>}
          </Stack>
        </Stack>
      </Card>
    </>
  );
}
