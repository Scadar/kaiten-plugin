import { createFileRoute } from '@tanstack/react-router';
import { useSyncedFields } from '@/hooks/useSyncedState';
import { useSyncedReady } from '@/hooks/useSyncedState';
import { Layout } from '@/components/Layout';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RefreshCw, Settings } from 'lucide-react';

/**
 * Index route (dashboard/home page).
 *
 * This is the main landing page of the application when opened in the IDE.
 * It displays project information and serves as the entry point for navigation.
 *
 * The path '/' is inferred from the filename 'index.tsx' in file-based routing.
 */
export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  // Auto-initialize state from IDE on mount
  const { isLoading } = useSyncedReady(true);

  // Access specific fields from synced state
  const { projectPath, selectedFile } = useSyncedFields(['projectPath', 'selectedFile'] as const);

  // Extract project name from path (last directory name)
  const projectName = projectPath ? projectPath.split(/[\\/]/).filter(Boolean).pop() : null;

  return (
    <Layout
      sidebar={<Sidebar />}
      toolbar={<Toolbar />}
    >
      <div className="flex flex-col items-center justify-center p-8">
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
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Loading project information...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-left">
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
              </CardContent>
            </Card>
          )}

          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>Connected to IDE</span>
          </div>

          {/* Welcome Message */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <p className="text-sm">
                Welcome to the React 19 UI rewrite! This dashboard demonstrates the JCEF bridge
                integration with bidirectional state synchronization between the IDE and React.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function Toolbar() {
  return (
    <div className="flex items-center gap-2 p-2">
      <Button variant="ghost" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh
      </Button>
      <Button variant="ghost" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <div className="ml-4 flex-1">
        <Input
          placeholder="Search tasks by title or ID..."
          className="max-w-md"
        />
      </div>
    </div>
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

      {/* Filters Section */}
      <FiltersPanel />
    </div>
  );
}
