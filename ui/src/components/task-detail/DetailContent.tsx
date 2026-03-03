import * as React from 'react';

import { GitBranch } from 'lucide-react';

import type { TaskDetail as TaskDetailType } from '@/api/types';
import { CreateBranchDialog } from '@/components/CreateBranchDialog';
import { EditableCustomPropertiesSection } from '@/components/task-detail/EditableCustomPropertiesSection';
import { EditableDescription } from '@/components/task-detail/EditableDescription';
import { InlineEditText } from '@/components/task-detail/InlineEditText';
import { TaskComments } from '@/components/task-detail/TaskComments';
import { TaskDetailHeader } from '@/components/task-detail/TaskDetailHeader';
import { TaskLinks } from '@/components/task-detail/TaskLinks';
import { TaskMetaEditable } from '@/components/task-detail/TaskMetaEditable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { useUpdateCard, useUpdateCardProperty } from '@/hooks/useKaitenQuery';
import { useSettings } from '@/hooks/useSettings';
import { useTaskDetailData } from '@/hooks/useTaskDetailData';

export interface DetailContentProps {
  task: TaskDetailType;
  onBack: () => void;
}

export function DetailContent({ task, onBack }: DetailContentProps) {
  const {
    columnName,
    kaitenUrl,
    comments,
    commentsLoading,
    commentsError,
    refetchComments,
    allFiles,
  } = useTaskDetailData(task);
  const settings = useSettings();
  const [showCreateBranch, setShowCreateBranch] = React.useState(false);

  const updateCard = useUpdateCard(task.id);
  const updateProperty = useUpdateCardProperty(task.id);

  const isSaving = updateCard.isPending || updateProperty.isPending;

  return (
    <div>
      <TaskDetailHeader
        taskId={task.id}
        columnName={columnName}
        onBack={onBack}
        kaitenUrl={kaitenUrl}
      />

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

      <Stack spacing="3" className="px-3 py-3">
        {/* Editable title */}
        <InlineEditText
          value={task.title}
          onSave={async (title) => {
            await updateCard.mutateAsync({ title });
          }}
          placeholder="Task title"
          className="w-full text-base leading-snug font-semibold"
        />

        <Separator />

        {/* Editable meta: assignee, due date, tags, and read-only fields */}
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

        {/* Editable custom properties */}
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

        {/* Editable description */}
        <Separator />
        <EditableDescription
          description={task.description}
          fileUids={allFiles.map((f) => f.uid)}
          onSave={async (description) => {
            await updateCard.mutateAsync({ description });
          }}
          isSaving={updateCard.isPending}
        />

        {task.externalLinks.length > 0 && (
          <>
            <Separator />
            <TaskLinks links={task.externalLinks} />
          </>
        )}

        <Separator />

        <TaskComments
          comments={comments}
          isLoading={commentsLoading}
          error={commentsError}
          onRefresh={() => refetchComments()}
          allFiles={allFiles}
        />
      </Stack>

      {showCreateBranch && (
        <CreateBranchDialog
          taskId={task.id}
          branchPatterns={settings.branchPatterns}
          onClose={() => setShowCreateBranch(false)}
        />
      )}
    </div>
  );
}
