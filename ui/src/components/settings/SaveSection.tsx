import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { CheckCircle2, Loader2, Save, XCircle } from 'lucide-react';

export interface SaveSectionProps {
  hasChanges: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onSave: () => void;
}

/** Save row: save button and status indicators. */
export function SaveSection({ hasChanges, isSaving, saveStatus, onSave }: SaveSectionProps) {
  return (
    <Stack direction="row" align="center" spacing="3" className="px-3 py-3">
      <Button
        size="xs"
        onClick={onSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>

      {saveStatus === 'success' && (
        <Stack direction="row" align="center" spacing="1" className="text-xs text-green-600 dark:text-green-500">
          <CheckCircle2 size={12} />
          <span>Saved</span>
        </Stack>
      )}
      {saveStatus === 'error' && (
        <Stack direction="row" align="center" spacing="1" className="text-xs text-destructive">
          <XCircle size={12} />
          <span>Failed</span>
        </Stack>
      )}
      {hasChanges && saveStatus === 'idle' && (
        <Text variant="dimmed">Unsaved changes</Text>
      )}
    </Stack>
  );
}
