/**
 * EventVerification - Interactive component for testing event propagation from IDE to React
 *
 * This component provides a UI to:
 * 1. Subscribe to events from IDE
 * 2. View received events in real-time
 * 3. Monitor state updates from events
 * 4. Test event propagation flow
 *
 * Usage: Add this component to a route or modal for manual IDE testing
 */

import { useState, useEffect, useCallback } from 'react';
import { bridge } from '@/bridge/JCEFBridge';
import { useSyncedStore } from '@/state/syncStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * Event log entry
 */
interface EventLogEntry {
  id: string;
  timestamp: number;
  eventName: string;
  payload: unknown;
  received: Date;
}

/**
 * EventVerification Component
 */
export function EventVerification() {
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [subscribedEvents, setSubscribedEvents] = useState<Set<string>>(new Set(['state:update']));
  const [customEventName, setCustomEventName] = useState('');

  // Access IDE-specific synced state to show real-time updates
  // NOTE: user and tasks are now fetched via React Query hooks (useCurrentUser, useTasks)
  const projectPath = useSyncedStore((state) => state.projectPath);
  const selectedFile = useSyncedStore((state) => state.selectedFile);
  const settings = useSyncedStore((state) => state.settings);

  /**
   * Subscribe to an event
   */
  const subscribeToEvent = useCallback((eventName: string) => {
    if (!eventName.trim() || subscribedEvents.has(eventName)) {
      return;
    }

    const unsubscribe = bridge.on(eventName as never, (payload: unknown) => {
      const logEntry: EventLogEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        eventName,
        payload,
        received: new Date(),
      };

      setEventLog((prev) => [logEntry, ...prev].slice(0, 50)); // Keep last 50 events
    });

    setSubscribedEvents((prev) => new Set([...prev, eventName]));

    // Return cleanup function
    return unsubscribe;
  }, [subscribedEvents]);

  /**
   * Unsubscribe from an event
   */
  const unsubscribeFromEvent = useCallback((eventName: string) => {
    setSubscribedEvents((prev) => {
      const updated = new Set(prev);
      updated.delete(eventName);
      return updated;
    });
  }, []);

  /**
   * Add custom event subscription
   */
  const addCustomEvent = useCallback(() => {
    if (customEventName.trim()) {
      subscribeToEvent(customEventName.trim());
      setCustomEventName('');
    }
  }, [customEventName, subscribeToEvent]);

  /**
   * Clear event log
   */
  const clearLog = useCallback(() => {
    setEventLog([]);
  }, []);

  /**
   * Set up default event subscriptions on mount
   * NOTE: Only subscribing to IDE-specific events (not data events like task:*, user:*)
   */
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    // Subscribe to IDE-specific events only
    // Data events (task:*, user:*) are now handled by React Query invalidation
    const commonEvents = [
      'state:update',
      'settings:changed',
      'file:selected',
      'project:opened',
      'project:closed',
    ];

    commonEvents.forEach((eventName) => {
      const unsub = subscribeToEvent(eventName);
      if (unsub) {
        unsubscribers.push(unsub);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []); // Empty deps - only run on mount

  /**
   * Format payload for display
   */
  const formatPayload = (payload: unknown): string => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (date: Date): string => {
    const timeStr = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Event Propagation Verification</CardTitle>
          <CardDescription>
            Test event propagation from IDE to React. Subscribe to events and monitor real-time updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current State Display - IDE-specific state only */}
          <div>
            <h3 className="text-sm font-medium mb-2">Current IDE State (from syncStore)</h3>
            <div className="space-y-1 text-xs font-mono bg-muted p-3 rounded-md">
              <div>
                <span className="text-muted-foreground">projectPath:</span>{' '}
                <span className="text-foreground">{projectPath || 'null'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">selectedFile:</span>{' '}
                <span className="text-foreground">{selectedFile || 'null'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">settings:</span>{' '}
                <span className="text-foreground">{Object.keys(settings).length} keys</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 <strong>Note:</strong> User and task data are now fetched via React Query hooks
              (<code className="bg-muted px-1 rounded">useCurrentUser()</code>, <code className="bg-muted px-1 rounded">useTasks()</code>)
              instead of being stored in the sync store.
            </p>
          </div>

          <Separator />

          {/* Subscribed Events */}
          <div>
            <h3 className="text-sm font-medium mb-2">Subscribed Events</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(subscribedEvents).map((eventName) => (
                <Badge key={eventName} variant="secondary">
                  {eventName}
                  <button
                    onClick={() => unsubscribeFromEvent(eventName)}
                    className="ml-2 text-xs hover:text-destructive"
                    aria-label={`Unsubscribe from ${eventName}`}
                  >
                    ✕
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Add Custom Event */}
          <div className="flex gap-2">
            <input
              type="text"
              value={customEventName}
              onChange={(e) => setCustomEventName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomEvent()}
              placeholder="Custom event name (e.g., custom:event)"
              className="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background"
            />
            <Button onClick={addCustomEvent} size="sm">
              Subscribe
            </Button>
          </div>

          <Separator />

          {/* Event Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Event Log ({eventLog.length})</h3>
              <Button onClick={clearLog} variant="outline" size="sm">
                Clear Log
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eventLog.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No events received yet. Trigger events from the IDE to see them here.
                </div>
              ) : (
                eventLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-muted rounded-md space-y-1 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono">
                        {entry.eventName}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatTime(entry.received)}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {formatPayload(entry.payload)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>To test event propagation from the IDE:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>
              In Kotlin code, get the bridge handler:
              <code className="block bg-muted p-2 mt-1 rounded text-xs font-mono">
                val bridge = toolWindow.contentManager.getContent(0)?.getUserData(...)
              </code>
            </li>
            <li>
              Emit an event:
              <code className="block bg-muted p-2 mt-1 rounded text-xs font-mono">
                bridge.emitEvent("task:updated", mapOf("taskId" to "123"))
              </code>
            </li>
            <li>Watch the event appear in the log above in real-time</li>
            <li>
              For state updates, use:
              <code className="block bg-muted p-2 mt-1 rounded text-xs font-mono">
                bridge.emitEvent("state:update", mapOf("selectedFile" to "/path/to/file.ts"))
              </code>
            </li>
            <li>Verify that the "Current State" section updates immediately</li>
          </ol>

          <Separator className="my-4" />

          <p className="font-medium">Common Events to Test:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <code className="text-xs bg-muted px-1 rounded">state:update</code> - State synchronization
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">task:created</code> - New task created
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">task:updated</code> - Task modified
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">file:selected</code> - File selection changed
            </li>
            <li>
              <code className="text-xs bg-muted px-1 rounded">settings:changed</code> - Settings updated
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
