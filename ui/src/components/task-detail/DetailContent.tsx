import * as React from 'react';

import { GitBranch } from 'lucide-react';

import type { TaskDetail as TaskDetailType } from '@/api/types';
import { CreateBranchDialog } from '@/components/CreateBranchDialog';
import { TaskComments } from '@/components/task-detail/TaskComments';
import { TaskDescription } from '@/components/task-detail/TaskDescription';
import { TaskDetailHeader } from '@/components/task-detail/TaskDetailHeader';
import { TaskLinks } from '@/components/task-detail/TaskLinks';
import { TaskMeta } from '@/components/task-detail/TaskMeta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
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
        {/* Title */}
        <Text variant="subheading" as="h1" className="leading-snug">
          {task.title}
        </Text>

        {/* Tags */}
        {task.tags.length > 0 && (
          <Stack direction="row" wrap="wrap" spacing="1">
            {task.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                size="xs"
                className="font-normal"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </Stack>
        )}

        <Separator />

        <TaskMeta task={task} />

        {task.description && (
          <>
            <Separator />
            <TaskDescription description={task.description} fileUids={allFiles.map((f) => f.uid)} />
          </>
        )}

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
