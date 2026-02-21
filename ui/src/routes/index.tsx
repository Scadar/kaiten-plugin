import { createFileRoute } from '@tanstack/react-router';
import { useSyncedFields } from '@/hooks/useSyncedState';
import { useSyncedReady } from '@/hooks/useSyncedState';

/**
 * Index route (dashboard/home page).
 *
 * This is the main landing page of the application when opened in the IDE.
 * It displays project information and serves as the entry point for navigation.
 *
 * The path '/' is inferred from the filename 'index.tsx' in file-based routing.
 */
export const Route = createFileRoute('/')({
  component: () => <IndexComponent />,
});

function IndexComponent() {
  // Auto-initialize state from IDE on mount
  const { isLoading } = useSyncedReady(true);

  // Access specific fields from synced state
  const { projectPath, selectedFile } = useSyncedFields(['projectPath', 'selectedFile'] as const);

  // Extract project name from path (last directory name)
  const projectName = projectPath ? projectPath.split(/[\\/]/).filter(Boolean).pop() : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl space-y-6 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Kaiten Plugin
          </h1>
          <p className="text-lg text-muted-foreground">
            JetBrains IDE integration for Kaiten project management
          </p>
        </div>

        {/* Project Information */}
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Loading project information...</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6 text-left">
            <h2 className="mb-4 text-xl font-semibold">Project Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Project Name:</span>
                <p className="mt-1 font-mono text-sm">
                  {projectName || 'Not available'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Project Path:</span>
                <p className="mt-1 font-mono text-sm break-all">
                  {projectPath || 'Not available'}
                </p>
              </div>
              {selectedFile && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Selected File:</span>
                  <p className="mt-1 font-mono text-sm break-all">
                    {selectedFile}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Connected to IDE</span>
        </div>

        {/* Welcome Message */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm">
            Welcome to the React 19 UI rewrite! This dashboard demonstrates the JCEF bridge
            integration with bidirectional state synchronization between the IDE and React.
          </p>
        </div>
      </div>
    </div>
  );
}
