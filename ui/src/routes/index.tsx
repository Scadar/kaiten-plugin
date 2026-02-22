import { createFileRoute } from '@tanstack/react-router';
import { useSyncedFields, useSyncedReady } from '@/hooks/useSyncedState';
import { Layout } from '@/components/Layout';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, FileCode2 } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent() {
  const { isLoading } = useSyncedReady(true);
  const { projectPath, selectedFile } = useSyncedFields(['projectPath', 'selectedFile'] as const);

  const projectName = projectPath
    ? projectPath.split(/[\\/]/).filter(Boolean).pop()
    : null;

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-medium text-[13px]">Kaiten Plugin</span>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Connected
        </div>
      </div>

      {/* Project info */}
      <div className="px-3 py-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading project info...</p>
        ) : (
          <div className="space-y-0.5">
            <InfoRow
              icon={<FolderOpen size={12} />}
              label="Project"
              value={projectName ?? 'Unknown'}
            />
            {projectPath && (
              <InfoRow
                label="Path"
                value={projectPath}
                mono
                truncate
              />
            )}
            {selectedFile && (
              <>
                <Separator className="my-1.5" />
                <InfoRow
                  icon={<FileCode2 size={12} />}
                  label="File"
                  value={selectedFile}
                  mono
                  truncate
                />
              </>
            )}
          </div>
        )}
      </div>

      <Separator />

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground leading-relaxed">
          JetBrains IDE integration for Kaiten project management.
          Use the tabs above to navigate between Tasks, Boards, and Settings.
        </p>
      </div>
    </Layout>
  );
}

interface InfoRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}

function InfoRow({ icon, label, value, mono, truncate }: InfoRowProps) {
  return (
    <div className="flex items-start gap-1.5 py-0.5">
      {icon && (
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      )}
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}:</span>
      <span
        className={['text-[11px] min-w-0', mono ? 'font-mono' : '', truncate ? 'truncate' : 'break-all'].join(' ')}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
