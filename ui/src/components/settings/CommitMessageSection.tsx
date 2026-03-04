import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';

import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { bridge } from '@/bridge/JCEFBridge';
import { FieldRow } from '@/components/settings/FieldRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

export interface CommitMessageSectionProps {
  currentSettings: KaitenSettings;
}

/** Commit message settings island: template editor for the toolbar button. */
export function CommitMessageSection({ currentSettings }: CommitMessageSectionProps) {
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState(currentSettings.commitMessageTemplate);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const hasChanges = template !== currentSettings.commitMessageTemplate;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await bridge.call('updateSettings', {
        settings: {
          ...currentSettings,
          commitMessageTemplate: template.trim() || 'ktn-{id}: {title}',
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
        <Text variant="overline">Commit message</Text>
      </div>

      <Card variant="island" padding="md">
        <Stack spacing="3">
          <FieldRow label="Template">
            <Input
              size="sm"
              type="text"
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setSaveStatus('idle');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
              }}
              className="font-mono"
            />
          </FieldRow>

          <Text variant="dimmed" className="leading-relaxed">
            Template for the <em>Insert Kaiten Task Reference</em> button in the commit dialog.{' '}
            <code className="bg-secondary rounded px-0.5">{'{id}'}</code> is the task number,{' '}
            <code className="bg-secondary rounded px-0.5">{'{title}'}</code> is the card title.
          </Text>

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
