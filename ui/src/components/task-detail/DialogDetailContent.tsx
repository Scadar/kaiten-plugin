import * as React from 'react';

import { AlertTriangle, ExternalLink, GitBranch, Link as LinkIcon } from 'lucide-react';

import type { TaskDetail } from '@/api/types';
import { CreateBranchDialog } from '@/components/CreateBranchDialog';
import { CardFilesSection } from '@/components/task-detail/CardFilesSection';
import { CommentsBottomBar } from '@/components/task-detail/CommentsBottomBar';
import { EditableCustomPropertiesSection } from '@/components/task-detail/EditableCustomPropertiesSection';
import { EditableDescription } from '@/components/task-detail/EditableDescription';
import { InlineEditText } from '@/components/task-detail/InlineEditText';
import { TaskMetaEditable } from '@/components/task-detail/TaskMetaEditable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useUpdateCard, useUpdateCardProperty } from '@/hooks/useKaitenQuery';
import { useSettings } from '@/hooks/useSettings';
import { useTaskDetailData } from '@/hooks/useTaskDetailData';

interface DialogDetailContentProps {
  task: TaskDetail;
}

/**
 * Task detail body rendered inside the card dialog.
 */
export function DialogDetailContent({ task }: DialogDetailContentProps) {
  const {
    columnName,
    kaitenUrl,
    comments,
    commentsLoading,
    commentsError,
    refetchComments,
    allFiles,
  } = useTaskDetailData(task);
  const fileUids = allFiles.map((f) => f.uid);
  const settings = useSettings();
  const [showCreateBranch, setShowCreateBranch] = React.useState(false);

  const updateCard = useUpdateCard(task.id);
  const updateProperty = useUpdateCardProperty(task.id);
  const isSaving = updateCard.isPending || updateProperty.isPending;

  return (
    <Stack>
      {/* ── Header ── */}
      <Stack
        direction="row"
        align="start"
        spacing="3"
        className="bg-card/95 border-border sticky top-0 z-10 border-b py-3 pr-10 pl-4 backdrop-blur-sm"
      >
        <Stack className="min-w-0 flex-1">
          <Stack direction="row" wrap="wrap" align="center" spacing="2" className="mb-1.5">
            <Text variant="dimmed">{task.id}</Text>
            {columnName && (
              <Badge variant="secondary" size="xs" className="font-normal">
                {columnName}
              </Badge>
            )}
            {task.blocked && (
              <Badge variant="destructive" size="xs" className="gap-0.5 font-normal">
                <AlertTriangle size={9} />
                Blocked
              </Badge>
            )}
          </Stack>
          <InlineEditText
            value={task.title}
            onSave={async (title) => {
              await updateCard.mutateAsync({ title });
            }}
            className="w-full text-base leading-snug font-semibold"
          />
        </Stack>

        {kaitenUrl && (
          <a
            href={kaitenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary mt-0.5 flex shrink-0 items-center gap-1 text-xs transition-colors"
            title="Open in Kaiten"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Open</span>
          </a>
        )}
      </Stack>

      {/* ── Actions ── */}
      <Card variant="island" padding="sm">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowCreateBranch(true)}
        >
          <GitBranch size={12} />
          Create Branch
        </Button>
      </Card>

      <Stack spacing="4" className="px-4 py-3">
        {/* ── Block reason ── */}
        {task.blocked && task.blockReason && (
          <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2">
            <AlertTriangle size={12} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-destructive text-sm leading-relaxed">{task.blockReason}</p>
          </div>
        )}

        <Separator />

        {/* ── Editable meta (assignee, due date, tags, …) ── */}
        <TaskMetaEditable
          task={task}
          onUpdateAssignee={async (owner_id) => {
            await updateCard.mutateAsync({ owner_id });
          }}
          onUpdateDueDate={async (due_date) => {
            await updateCard.mutateAsync({ due_date });
          }}
          onUpdateTags={async (tag_ids) => {
            await updateCard.mutateAsync({ tag_ids });
          }}
          isSaving={isSaving}
        />

        {/* ── Editable custom properties ── */}
        {Object.keys(task.properties).length > 0 && (
          <>
            <Separator />
            <EditableCustomPropertiesSection
              properties={task.properties}
              onSaveProperty={async (propertyId, value) => {
                await updateProperty.mutateAsync({ propertyId, value });
              }}
            />
          </>
        )}

        {/* ── Editable description ── */}
        <Separator />
        <EditableDescription
          description={task.description}
          fileUids={fileUids}
          onSave={async (description) => {
            await updateCard.mutateAsync({ description });
          }}
          isSaving={updateCard.isPending}
        />

        {/* ── Files ── */}
        {allFiles.length > 0 && (
          <>
            <Separator />
            <CardFilesSection files={allFiles} />
          </>
        )}

        {/* ── External links ── */}
        {task.externalLinks.length > 0 && (
          <>
            <Separator />
            <Stack spacing="2">
              <SectionHeading>Links ({task.externalLinks.length})</SectionHeading>
              <Stack spacing="1.5">
                {task.externalLinks.map((link, i) => (
                  <Stack key={i} direction="row" align="start" spacing="1.5">
                    <LinkIcon size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary block truncate text-sm hover:underline"
                        title={link.url}
                      >
                        {link.description ?? link.url}
                      </a>
                      {link.description && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {link.url}
                        </span>
                      )}
                    </div>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </>
        )}

        {/* ── Kaiten link (bottom) ── */}
        {kaitenUrl && (
          <>
            <Separator />
            <Stack direction="row" align="center" spacing="2">
              <ExternalLink size={11} className="text-muted-foreground shrink-0" />
              <a
                href={kaitenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary truncate text-xs transition-colors"
                title={kaitenUrl}
              >
                {kaitenUrl}
              </a>
            </Stack>
          </>
        )}

        {/* spacer so content isn't hidden behind fixed comments bar */}
        <div className="h-12" />
      </Stack>

      {showCreateBranch && (
        <CreateBranchDialog
          taskId={task.id}
          branchPatterns={settings.branchPatterns}
          onClose={() => setShowCreateBranch(false)}
        />
      )}

      <CommentsBottomBar
        comments={comments}
        isLoading={commentsLoading}
        error={commentsError}
        onRefresh={refetchComments}
        allFiles={allFiles}
      />
    </Stack>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text variant="overline">{children}</Text>;
}
