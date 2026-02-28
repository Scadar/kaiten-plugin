import { MessageSquare, RefreshCw } from 'lucide-react';

import type { Comment, CardFile } from '@/api/types';
import { CommentItem } from '@/components/task-detail/CommentItem';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

export interface TaskCommentsProps {
  comments: Comment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  allFiles?: CardFile[];
}

/** Comments section: header with count + refresh, then list or state messages. */
export function TaskComments({
  comments,
  isLoading,
  error,
  onRefresh,
  allFiles = [],
}: TaskCommentsProps) {
  return (
    <Stack spacing="0">
      <Stack direction="row" align="center" spacing="1.5" className="mb-2">
        <MessageSquare size={12} className="text-muted-foreground" />
        <Text variant="overline">Comments</Text>
        {comments && <Text variant="dimmed">({comments.length})</Text>}
        <Button variant="ghost" size="icon-xs" className="ml-auto h-5 w-5" onClick={onRefresh}>
          <RefreshCw size={11} />
        </Button>
      </Stack>

      {isLoading ? (
        <Text variant="dimmed" className="pl-0.5">
          Loading comments...
        </Text>
      ) : error ? (
        <Text variant="dimmed" className="text-destructive pl-0.5">
          {error.message}
        </Text>
      ) : !comments?.length ? (
        <Text variant="dimmed" className="pl-0.5">
          No comments yet
        </Text>
      ) : (
        <div className="border-border bg-card shadow-island-sm divide-border divide-y rounded-lg border">
          {[...comments]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((comment) => (
              <div key={comment.id} className="px-2.5">
                <CommentItem
                  comment={comment}
                  files={allFiles.filter((f) => f.commentId === comment.id)}
                />
              </div>
            ))}
        </div>
      )}
    </Stack>
  );
}
