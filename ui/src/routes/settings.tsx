import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '@/hooks/useSettings';
import { settingsKeys } from '@/api/endpoints';
import { bridge } from '@/bridge/JCEFBridge';
import { KaitenApiClient } from '@/api/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KaitenSettings } from '@/api/types';

export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

function SettingsComponent() {
  const currentSettings = useSettings();
  const queryClient = useQueryClient();

  const [serverUrl, setServerUrl] = useState(currentSettings.serverUrl);
  const [apiToken, setApiToken] = useState(currentSettings.apiToken);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  const hasChanges =
    serverUrl !== currentSettings.serverUrl || apiToken !== currentSettings.apiToken;

  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !apiToken.trim()) {
      setTestStatus('error');
      setTestMessage('Enter both Server URL and API Token');
      return;
    }
    setTestStatus('testing');
    setTestMessage('Testing...');
    try {
      const client = new KaitenApiClient({ serverUrl: serverUrl.trim(), apiToken: apiToken.trim() });
      const user = await client.getCurrentUser();
      setTestStatus('success');
      setTestMessage(`Connected as ${user.name}`);
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const updated: KaitenSettings = {
        ...currentSettings,
        serverUrl: serverUrl.trim(),
        apiToken: apiToken.trim(),
      };
      await bridge.call('updateSettings', { settings: updated });
      await queryClient.invalidateQueries({ queryKey: settingsKeys.all() });
      setSaveStatus('success');
      await bridge.call('showNotification', { message: 'Settings saved', type: 'info', title: 'Settings' });
      setTestStatus('idle');
      setTestMessage('');
    } catch (err) {
      setSaveStatus('error');
      await bridge.call('showNotification', {
        message: `Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`,
        type: 'error',
        title: 'Settings Error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      {/* Section: Connection */}
      <div className="px-3 pt-3 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Connection
        </p>
      </div>

      <div className="px-3 pb-3 space-y-3">
        <FieldRow label="Server URL">
          <Input
            type="url"
            placeholder="https://yourcompany.kaiten.ru"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="h-7 text-xs"
          />
        </FieldRow>

        <FieldRow label="API Token">
          <Input
            type="password"
            placeholder="Paste your API token"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            className="h-7 text-xs"
          />
        </FieldRow>

        {/* Test connection */}
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleTestConnection}
            disabled={testStatus === 'testing' || !serverUrl.trim() || !apiToken.trim()}
          >
            {testStatus === 'testing' ? (
              <Loader2 size={12} className="mr-1.5 animate-spin" />
            ) : (
              <RefreshCw size={12} className="mr-1.5" />
            )}
            Test Connection
          </Button>

          {testMessage && (
            <div
              className={cn(
                'flex items-start gap-1.5 text-[11px]',
                testStatus === 'success' ? 'text-green-600 dark:text-green-500' : 'text-destructive'
              )}
            >
              {testStatus === 'success' ? (
                <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
              ) : (
                <XCircle size={12} className="mt-0.5 shrink-0" />
              )}
              <span>{testMessage}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Save */}
      <div className="px-3 py-3 flex items-center gap-3">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <Loader2 size={12} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={12} className="mr-1.5" />
          )}
          Save
        </Button>

        {saveStatus === 'success' && (
          <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-500">
            <CheckCircle2 size={12} />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <XCircle size={12} />
            Failed
          </span>
        )}
        {hasChanges && saveStatus === 'idle' && (
          <span className="text-[11px] text-muted-foreground">Unsaved changes</span>
        )}
      </div>
    </Layout>
  );
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
