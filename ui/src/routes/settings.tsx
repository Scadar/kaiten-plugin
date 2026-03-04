import { createFileRoute } from '@tanstack/react-router';

import { Layout } from '@/components/Layout';
import { CommitMessageSection } from '@/components/settings/CommitMessageSection';
import { ConnectionSection } from '@/components/settings/ConnectionSection';
import { GitTrackingSection } from '@/components/settings/GitTrackingSection';
import { ReleasesSection } from '@/components/settings/ReleasesSection';
import { TasksSpaceSection } from '@/components/settings/TasksSpaceSection';
import { useSettings } from '@/hooks/useSettings';

export const Route = createFileRoute('/settings')({
  component: SettingsComponent,
});

function SettingsComponent() {
  const currentSettings = useSettings();

  return (
    <Layout>
      <ConnectionSection currentSettings={currentSettings} />
      <GitTrackingSection currentSettings={currentSettings} />
      <CommitMessageSection currentSettings={currentSettings} />
      <TasksSpaceSection currentSettings={currentSettings} />
      <ReleasesSection currentSettings={currentSettings} />
    </Layout>
  );
}
