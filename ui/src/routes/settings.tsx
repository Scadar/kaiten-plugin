import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { bridge } from '@/bridge/JCEFBridge';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { KaitenSettings } from '@/api/types';

/**
 * Settings route - plugin configuration page.
 *
 * This route displays the Kaiten plugin settings with:
 * - Server URL configuration
 * - API token management
 * - Connection testing
 * - Settings persistence via IDE bridge
 *
 * The path '/settings' is inferred from the filename 'settings.tsx' in file-based routing.
 */
export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

type TestConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

function SettingsComponent() {
  const currentSettings = useSettings();

  // Form state
  const [serverUrl, setServerUrl] = useState(currentSettings.serverUrl);
  const [apiToken, setApiToken] = useState(currentSettings.apiToken);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Test connection state
  const [testStatus, setTestStatus] = useState<TestConnectionStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Track if form has unsaved changes
  const hasChanges =
    serverUrl !== currentSettings.serverUrl ||
    apiToken !== currentSettings.apiToken;

  /**
   * Test connection to Kaiten API
   */
  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !apiToken.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter both Server URL and API Token');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Testing connection...');

    try {
      // Use the bridge to test connection
      // This will call the IDE's test connection functionality
      const response = await fetch(`${serverUrl.trim()}/users/current`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        setTestStatus('success');
        setTestMessage(`Connection successful! Logged in as: ${user.full_name}`);
      } else {
        setTestStatus('error');
        setTestMessage(`Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Save settings via IDE bridge
   */
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Create updated settings object
      const updatedSettings: KaitenSettings = {
        ...currentSettings,
        serverUrl: serverUrl.trim(),
        apiToken: apiToken.trim(),
      };

      // Call bridge RPC to update settings in IDE
      await bridge.call('updateSettings', { settings: updatedSettings });

      setSaveStatus('success');

      // Show success notification
      await bridge.call('showNotification', {
        message: 'Settings saved successfully',
        type: 'info',
        title: 'Settings',
      });

      // Reset test status since settings changed
      setTestStatus('idle');
      setTestMessage('');
    } catch (error) {
      setSaveStatus('error');

      // Show error notification
      await bridge.call('showNotification', {
        message: `Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        title: 'Settings Error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout sidebar={<Sidebar />}>
      <div className="p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your Kaiten plugin connection and preferences
          </p>
        </div>

        {/* Connection Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Settings</CardTitle>
            <CardDescription>
              Configure your Kaiten server connection. These settings are stored in the IDE.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Server URL */}
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                type="url"
                placeholder="https://yourcompany.kaiten.ru"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The URL of your Kaiten server instance
              </p>
            </div>

            {/* API Token */}
            <div className="space-y-2">
              <Label htmlFor="apiToken">API Token</Label>
              <Input
                id="apiToken"
                type="password"
                placeholder="Enter your API token"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Your personal API token for authentication
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing' || !serverUrl.trim() || !apiToken.trim()}
              >
                {testStatus === 'testing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {/* Test Connection Status */}
              {testMessage && (
                <div
                  className={`mt-3 flex items-start gap-2 text-sm ${
                    testStatus === 'success'
                      ? 'text-green-600'
                      : testStatus === 'error'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {testStatus === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
                  {testStatus === 'error' && <XCircle className="h-4 w-4 mt-0.5" />}
                  {testStatus === 'testing' && <Loader2 className="h-4 w-4 mt-0.5 animate-spin" />}
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>

          {saveStatus === 'success' && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved successfully
            </span>
          )}

          {saveStatus === 'error' && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              Failed to save settings
            </span>
          )}

          {hasChanges && saveStatus === 'idle' && (
            <span className="text-sm text-muted-foreground">
              You have unsaved changes
            </span>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Sidebar() {
  return (
    <div className="p-4 space-y-6">
      {/* Navigation */}
      <div>
        <h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">Navigation</h2>
        <Navigation />
      </div>
    </div>
  );
}
