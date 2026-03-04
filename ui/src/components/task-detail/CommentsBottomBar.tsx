import { MessageSquare, RefreshCw } from 'lucide-react';

import type { CardFile, Comment } from '@/api/types';
import { TaskComments } from '@/components/task-detail/TaskComments';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';

interface CommentsBottomBarProps {
  comments: Comment[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
  allFiles?: CardFile[];
}

export function CommentsBottomBar({
  comments,
  isLoading,
  error,
  onRefresh,
  allFiles = [],
}: CommentsBottomBarProps) {
  return (
    <Sheet>
      {/* Fixed bottom strip */}
      <div className="bg-card/95 border-border fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur-sm">
        <Stack direction="row" align="center" spacing="2" className="px-4 py-2">
          <MessageSquare size={12} className="text-muted-foreground shrink-0" />
          <Text variant="overline" className="flex-1">
            Comments
            {!isLoading && comments !== undefined && (
              <span className="text-muted-foreground ml-1.5 font-normal tracking-normal normal-case">
                ({comments.length})
              </span>
            )}
          </Text>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              Expand
            </Button>
          </SheetTrigger>
        </Stack>
      </div>

      {/* Sheet slides up from the bottom */}
      <SheetContent side="bottom" className="flex h-[72vh] flex-col p-0">
        <SheetHeader className="border-border shrink-0 border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare size={13} />
            Comments
            {comments !== undefined && (
              <span className="text-muted-foreground font-normal">({comments.length})</span>
            )}
            <Button variant="ghost" size="icon-xs" className="h-5 w-5" onClick={onRefresh}>
              <RefreshCw size={11} />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <TaskComments
            comments={comments}
            isLoading={isLoading}
            error={error}
            onRefresh={onRefresh}
            allFiles={allFiles}
            hideHeader
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
