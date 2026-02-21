/**
 * State Synchronization Verification Component
 *
 * Interactive component for manual testing of bidirectional state synchronization
 * between the IDE and React application.
 *
 * This component allows you to:
 * - View current synchronized state
 * - Update state from React side (syncs to IDE)
 * - Monitor state changes from IDE side
 * - See sync history and verify bidirectional flow
 *
 * Usage: Add this component to a route or page to test state synchronization
 */

import { useState, useEffect, useRef } from 'react';
import {
  useSyncedState,
  useSyncedField,
  useSyncedStateEffect,
} from '@/hooks/useSyncedState';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * State change log entry
 */
interface StateChangeLog {
  timestamp: string;
  source: 'react' | 'ide';
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * State Synchronization Verification Component
 */
export function StateSyncVerification() {
  const { state, updateField, updateFields, isLoading, error, isReady } =
    useSyncedState();

  // Use useSyncedField for individual field management
  const [selectedFile, setSelectedFile] = useSyncedField('selectedFile');
  const [projectPath, setProjectPath] = useSyncedField('projectPath');

  // Local state for form inputs
  const [fileInput, setFileInput] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [settingKey, setSettingKey] = useState('');
  const [settingValue, setSettingValue] = useState('');

  // State change log
  const [changeLog, setChangeLog] = useState<StateChangeLog[]>([]);

  // Ref to track previous state for comparison
  const previousStateRef = useRef(state);

  // Monitor state changes from IDE
  useSyncedStateEffect('selectedFile', (newValue, oldValue) => {
    addToLog('ide', 'selectedFile', oldValue, newValue);
  });

  useSyncedStateEffect('projectPath', (newValue, oldValue) => {
    addToLog('ide', 'projectPath', oldValue, newValue);
  });

  useSyncedStateEffect('settings', (newValue, oldValue) => {
    addToLog('ide', 'settings', oldValue, newValue);
  });

  useSyncedStateEffect('user', (newValue, oldValue) => {
    addToLog('ide', 'user', oldValue, newValue);
  });

  // Add entry to change log
  const addToLog = (
    source: 'react' | 'ide',
    field: string,
    oldValue: unknown,
    newValue: unknown
  ) => {
    setChangeLog((prev) => [
      {
        timestamp: new Date().toLocaleTimeString(),
        source,
        field,
        oldValue,
        newValue,
      },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);
  };

  // Update selected file from React
  const handleUpdateFile = () => {
    if (fileInput.trim()) {
      addToLog('react', 'selectedFile', selectedFile, fileInput);
      setSelectedFile(fileInput);
      setFileInput('');
    }
  };

  // Update project path from React
  const handleUpdatePath = () => {
    if (pathInput.trim()) {
      addToLog('react', 'projectPath', projectPath, pathInput);
      setProjectPath(pathInput);
      setPathInput('');
    }
  };

  // Update setting from React
  const handleUpdateSetting = () => {
    if (settingKey.trim()) {
      const oldSettings = state.settings;
      const newSettings = {
        ...oldSettings,
        [settingKey]: settingValue,
      };
      addToLog('react', 'settings', oldSettings, newSettings);
      updateField('settings', newSettings);
      setSettingKey('');
      setSettingValue('');
    }
  };

  // Update user from React
  const handleUpdateUser = () => {
    const oldUser = state.user;
    const newUser = oldUser
      ? null
      : { id: 'test-user', name: 'Test User', email: 'test@example.com' };
    addToLog('react', 'user', oldUser, newUser);
    updateField('user', newUser);
  };

  // Clear change log
  const handleClearLog = () => {
    setChangeLog([]);
  };

  // Sync all fields at once
  const handleBulkUpdate = () => {
    const updates = {
      selectedFile: '/bulk/update/file.txt',
      settings: { bulkUpdate: true, timestamp: Date.now() },
    };
    addToLog('react', 'bulk', previousStateRef.current, updates);
    updateFields(updates);
  };

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">State Synchronization Verification</h1>
        <Badge variant={isReady ? 'default' : 'secondary'}>
          {isLoading ? 'Loading...' : isReady ? 'Ready' : 'Not Ready'}
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current State Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Synchronized State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Project Path
              </Label>
              <p className="text-sm font-mono break-all">
                {formatValue(state.projectPath)}
              </p>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">
                Selected File
              </Label>
              <p className="text-sm font-mono break-all">
                {formatValue(state.selectedFile)}
              </p>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">Settings</Label>
              <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                {formatValue(state.settings)}
              </pre>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">User</Label>
              <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                {formatValue(state.user)}
              </pre>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">
                Tasks Count
              </Label>
              <p className="text-sm">{state.tasks.length}</p>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">Filters</Label>
              <pre className="text-xs font-mono bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                {formatValue(state.filters)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* React → IDE Updates */}
        <Card>
          <CardHeader>
            <CardTitle>Update State from React</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Changes will sync to IDE via bridge
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Update Selected File */}
            <div className="space-y-2">
              <Label htmlFor="file-input">Update Selected File</Label>
              <div className="flex gap-2">
                <Input
                  id="file-input"
                  type="text"
                  placeholder="/path/to/file.txt"
                  value={fileInput}
                  onChange={(e) => setFileInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateFile()}
                />
                <Button onClick={handleUpdateFile} size="sm">
                  Update
                </Button>
              </div>
            </div>

            <Separator />

            {/* Update Project Path */}
            <div className="space-y-2">
              <Label htmlFor="path-input">Update Project Path</Label>
              <div className="flex gap-2">
                <Input
                  id="path-input"
                  type="text"
                  placeholder="/path/to/project"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdatePath()}
                />
                <Button onClick={handleUpdatePath} size="sm">
                  Update
                </Button>
              </div>
            </div>

            <Separator />

            {/* Update Setting */}
            <div className="space-y-2">
              <Label htmlFor="setting-key">Update Setting</Label>
              <div className="flex gap-2">
                <Input
                  id="setting-key"
                  type="text"
                  placeholder="key"
                  value={settingKey}
                  onChange={(e) => setSettingKey(e.target.value)}
                  className="flex-1"
                />
                <Input
                  id="setting-value"
                  type="text"
                  placeholder="value"
                  value={settingValue}
                  onChange={(e) => setSettingValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateSetting()}
                  className="flex-1"
                />
                <Button onClick={handleUpdateSetting} size="sm">
                  Set
                </Button>
              </div>
            </div>

            <Separator />

            {/* Toggle User */}
            <div className="space-y-2">
              <Label>Toggle User</Label>
              <Button onClick={handleUpdateUser} variant="outline" size="sm" className="w-full">
                {state.user ? 'Clear User' : 'Set Test User'}
              </Button>
            </div>

            <Separator />

            {/* Bulk Update */}
            <div className="space-y-2">
              <Label>Bulk Update</Label>
              <Button onClick={handleBulkUpdate} variant="secondary" size="sm" className="w-full">
                Update Multiple Fields
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>State Change Log</CardTitle>
            <Button onClick={handleClearLog} variant="outline" size="sm">
              Clear Log
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor bidirectional state changes
          </p>
        </CardHeader>
        <CardContent>
          {changeLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No state changes yet. Update state from React or IDE to see changes.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {changeLog.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded text-xs"
                >
                  <Badge
                    variant={entry.source === 'react' ? 'default' : 'secondary'}
                    className="mt-0.5 shrink-0"
                  >
                    {entry.source === 'react' ? 'React → IDE' : 'IDE → React'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">
                        {entry.field}
                      </span>
                      <span className="text-muted-foreground">
                        {entry.timestamp}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Old:</span>
                        <pre className="text-xs font-mono bg-background p-1 rounded mt-0.5 overflow-auto max-h-20">
                          {formatValue(entry.oldValue)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-muted-foreground">New:</span>
                        <pre className="text-xs font-mono bg-background p-1 rounded mt-0.5 overflow-auto max-h-20">
                          {formatValue(entry.newValue)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">React → IDE Sync</h4>
            <p className="text-muted-foreground">
              1. Enter values in the "Update State from React" section<br />
              2. Click "Update" button<br />
              3. Change log should show "React → IDE" entry<br />
              4. Verify IDE receives the update (check IDE logs or state)<br />
              5. Current state should reflect the new value
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-1">IDE → React Sync</h4>
            <p className="text-muted-foreground">
              1. Change state in IDE (e.g., select a different file)<br />
              2. IDE should emit state:update event<br />
              3. Change log should show "IDE → React" entry<br />
              4. Current state should update automatically<br />
              5. Verify new value appears in "Current Synchronized State"
            </p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold mb-1">Round-trip Verification</h4>
            <p className="text-muted-foreground">
              1. Update state from React<br />
              2. Verify IDE receives it<br />
              3. IDE echoes the change back via state:update<br />
              4. Verify no circular updates (change log shows only expected entries)<br />
              5. State remains consistent
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
