import { CheckCircle2, XCircle } from 'lucide-react';

import type { KaitenSettings } from '@/api/types';
import { bridge } from '@/bridge/JCEFBridge';
import { Card } from '@/components/ui/card';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

export interface ConnectionSectionProps {
  currentSettings: KaitenSettings;
}

function openIdeSettings() {
  bridge.call('openSettings', undefined).catch(console.error);
}

/** Read-only connection status. Server URL and API token are configured in IDE Settings → Kaiten. */
export function ConnectionSection({ currentSettings }: ConnectionSectionProps) {
  const { serverUrl, hasToken } = currentSettings;

  return (
    <>
      <div className="px-3 pt-3 pb-1">
        <Text variant="overline">Connection</Text>
      </div>

      <Card variant="island" padding="md">
        <Stack spacing="2.5">
          <Stack direction="row" align="center" spacing="2">
            {hasToken ? (
              <CheckCircle2 size={14} className="shrink-0 text-green-600 dark:text-green-500" />
            ) : (
              <XCircle size={14} className="text-destructive shrink-0" />
            )}
            <Text
              variant="dimmed"
              className={cn(hasToken ? 'text-green-600 dark:text-green-500' : 'text-destructive')}
            >
              {hasToken ? 'API token configured' : 'API token not set'}
            </Text>
          </Stack>

          {serverUrl && (
            <Text variant="dimmed" className="truncate text-xs">
              {serverUrl}
            </Text>
          )}

          <Text variant="dimmed">
            Configure Server URL and API token in{' '}
            <button
              type="button"
              onClick={openIdeSettings}
              className="text-foreground font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              IDE Settings → Kaiten
            </button>
            .
          </Text>
        </Stack>
      </Card>
    </>
  );
}
