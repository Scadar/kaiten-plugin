import { useTaskDetailData } from '@/hooks/useTaskDetailData';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { TaskDetailHeader } from '@/components/task-detail/TaskDetailHeader';
import { TaskMeta } from '@/components/task-detail/TaskMeta';
import { TaskDescription } from '@/components/task-detail/TaskDescription';
import { TaskLinks } from '@/components/task-detail/TaskLinks';
import { TaskComments } from '@/components/task-detail/TaskComments';
import type { TaskDetail as TaskDetailType } from '@/api/types';

export interface DetailContentProps {
  task: TaskDetailType;
  onBack: () => void;
}

export function DetailContent({ task, onBack }: DetailContentProps) {
  const { columnName, kaitenUrl, comments, commentsLoading, commentsError, refetchComments, allFiles } =
    useTaskDetailData(task);

  return (
    <div>
      <TaskDetailHeader taskId={task.id} columnName={columnName} onBack={onBack} kaitenUrl={kaitenUrl} />

      <Stack spacing="3" className="px-3 py-3">
        {/* Title */}
        <Text variant="subheading" as="h1" className="leading-snug">{task.title}</Text>

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
    </div>
  );
}
