import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { Plus, Save, X, CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { settingsKeys } from '@/api/endpoints';
import type { KaitenSettings } from '@/api/types';
import { bridge } from '@/bridge/JCEFBridge';
import { FieldRow } from '@/components/settings/FieldRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

export interface GitTrackingSectionProps {
  currentSettings: KaitenSettings;
}

/** Git tracking settings island: branch patterns list editor with its own save button. */
export function GitTrackingSection({ currentSettings }: GitTrackingSectionProps) {
  const queryClient = useQueryClient();

  const [branchPatterns, setBranchPatterns] = useState(currentSettings.branchPatterns);
  const [newPattern, setNewPattern] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const hasChanges =
    JSON.stringify(branchPatterns) !== JSON.stringify(currentSettings.branchPatterns);

  const handleAdd = () => {
    const trimmed = newPattern.trim();
    if (!trimmed || branchPatterns.includes(trimmed)) return;
    setBranchPatterns([...branchPatterns, trimmed]);
    setNewPattern('');
    setSaveStatus('idle');
  };

  const handleRemove = (pattern: string) => {
    setBranchPatterns(branchPatterns.filter((p) => p !== pattern));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await bridge.call('updateSettings', {
        settings: {
          ...currentSettings,
          branchPatterns: branchPatterns.length > 0 ? branchPatterns : ['task/ktn-{id}'],
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
        <Text variant="overline">Git tracking</Text>
      </div>

      <Card variant="island" padding="md">
        <Stack spacing="3">
          <FieldRow label="Branch patterns">
            <Stack spacing="1.5">
              {branchPatterns.map((pattern) => (
                <Stack key={pattern} direction="row" align="center" spacing="1">
                  <code className="bg-secondary flex-1 truncate rounded px-2 py-0.5 font-mono text-xs">
                    {pattern}
                  </code>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleRemove(pattern)}
                    disabled={branchPatterns.length === 1}
                    title="Remove"
                    className="shrink-0"
                  >
                    <X size={12} />
                  </Button>
                </Stack>
              ))}

              <Stack direction="row" align="center" spacing="1">
                <Input
                  size="sm"
                  type="text"
                  placeholder="fix/ktn-{id}"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                  }}
                  className="flex-1 font-mono"
                />
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleAdd}
                  disabled={!newPattern.trim()}
                  title="Add pattern"
                  className="shrink-0"
                >
                  <Plus size={12} />
                </Button>
              </Stack>
            </Stack>
          </FieldRow>

          <Text variant="dimmed" className="leading-relaxed">
            Patterns to identify task branches.{' '}
            <code className="bg-secondary rounded px-0.5">{'{id}'}</code> matches the task number.
            All patterns are checked when comparing release branches.
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
