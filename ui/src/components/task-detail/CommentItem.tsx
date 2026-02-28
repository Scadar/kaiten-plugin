import type { Comment, CardFile } from '@/api/types';
import { CardFilesSection } from '@/components/task-detail/CardFilesSection';
import { RichTextContent } from '@/components/task-detail/RichTextContent';
import { UserAvatar } from '@/components/task-detail/UserAvatar';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { formatDateTime } from '@/lib/format';

export interface CommentItemProps {
  comment: Comment;
  files?: CardFile[];
}

/** Islands-style comment row: avatar + author name + timestamp + body. */
export function CommentItem({ comment, files = [] }: CommentItemProps) {
  const excludeUids = files.map((f) => f.uid);

  return (
    <Stack direction="row" spacing="2.5" className="py-2.5">
      <UserAvatar name={comment.author.fullName} />
      <Stack className="min-w-0 flex-1" spacing="0">
        <Stack direction="row" align="baseline" spacing="2">
          <span className="text-sm font-medium">{comment.author.fullName}</span>
          <Text variant="dimmed">{formatDateTime(comment.createdAt)}</Text>
        </Stack>
        <p className="text-foreground/90 mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap">
          <RichTextContent html={comment.text} excludeUids={excludeUids} />
        </p>
        {files.length > 0 && (
          <div className="mt-2">
            <CardFilesSection files={files} showHeading={false} />
          </div>
        )}
      </Stack>
    </Stack>
  );
}
