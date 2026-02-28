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
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useSpaces } from '@/hooks/useKaitenQuery';
import { useFilterActions } from '@/state/filterStore';

export interface TasksSpaceSectionProps {
  currentSettings: KaitenSettings;
}

/** Tasks space island: selects which space to use on the Tasks page. */
export function TasksSpaceSection({ currentSettings }: TasksSpaceSectionProps) {
  const queryClient = useQueryClient();
  const { setSelectedSpace } = useFilterActions();

  const [spaceId, setSpaceId] = useState<number | null>(currentSettings.selectedSpaceId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: spaces, isLoading: spacesLoading } = useSpaces();

  const spaceOptions = (spaces ?? []).map((s) => ({ value: String(s.id), label: s.name }));

  const hasChanges = spaceId !== (currentSettings.selectedSpaceId ?? null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await bridge.call('updateSettings', {
        settings: {
          ...currentSettings,
          selectedSpaceId: spaceId,
        },
      });
      await queryClient.invalidateQueries({ queryKey: settingsKeys.all() });
      setSelectedSpace(spaceId);
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
        <Text variant="overline">Tasks</Text>
      </div>

      <Card variant="island" padding="md">
        <Stack spacing="3">
          <FieldRow label="Space">
            <ComboboxSelect
              options={spaceOptions}
              value={spaceId !== null ? String(spaceId) : null}
              onChange={(val) => {
                setSpaceId(val ? Number(val) : null);
                setSaveStatus('idle');
              }}
              placeholder={spacesLoading ? 'Loading…' : 'Select space…'}
              searchPlaceholder="Search spaces…"
              emptyText="No spaces found."
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
