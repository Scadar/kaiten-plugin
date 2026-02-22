import { useCardDetail, useCardComments, useColumns } from '@/hooks/useKaitenQuery';
import { useFilterStore } from '@/state/filterStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Link as LinkIcon,
  MessageSquare,
  User,
  Users,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Comment, TaskDetail as TaskDetailType } from '@/api/types';

interface TaskDetailProps {
  taskId: number;
  onBack: () => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-6 w-6 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold">
      {initials}
    </div>
  );
}

interface MetaRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function MetaRow({ icon, label, children }: MetaRowProps) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[12px] min-w-0">{children}</span>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const text = stripHtml(comment.text);
  return (
    <div className="flex gap-2 py-2">
      <UserAvatar name={comment.author.fullName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-medium">{comment.author.fullName}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}

function DetailContent({ task, onBack }: { task: TaskDetailType; onBack: () => void }) {
  const selectedBoardId = useFilterStore((s) => s.selectedBoardId);
  const { data: columns } = useColumns(selectedBoardId);
  const { data: comments, isLoading: commentsLoading, error: commentsError, refetch: refetchComments } =
    useCardComments(task.id);

  const columnName = columns?.find((c) => c.id === task.columnId)?.name;
  const assignee = task.participants.find((p) => p.id === task.assigneeId);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-border bg-background px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft size={13} />
        </Button>
        <span className="font-mono text-[11px] text-muted-foreground">#{task.id}</span>
        <div className="ml-auto flex items-center gap-1">
          {columnName && (
            <Badge variant="secondary" className="h-4 rounded-sm px-1.5 py-0 text-[10px] font-normal">
              {columnName}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-3 py-3 space-y-3">
        {/* Title */}
        <h1 className="text-[14px] font-semibold leading-snug">{task.title}</h1>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="h-4 rounded-sm px-1.5 py-0 text-[10px] font-normal"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Meta info */}
        <div className="space-y-0">
          {assignee && (
            <MetaRow icon={<User size={12} />} label="Assignee">
              <span>{assignee.fullName}</span>
            </MetaRow>
          )}

          {task.participants.length > 0 && (
            <MetaRow icon={<Users size={12} />} label="Members">
              <span>{task.participants.map((p) => p.fullName).join(', ')}</span>
            </MetaRow>
          )}

          {task.dueDate && (
            <MetaRow icon={<Calendar size={12} />} label="Due date">
              <span>{formatDate(task.dueDate)}</span>
            </MetaRow>
          )}

          {task.createdAt && (
            <MetaRow icon={<Clock size={12} />} label="Created">
              <span className="text-muted-foreground">{formatDateTime(task.createdAt)}</span>
            </MetaRow>
          )}

          {task.updatedAt && (
            <MetaRow icon={<Clock size={12} />} label="Updated">
              <span className="text-muted-foreground">{formatDateTime(task.updatedAt)}</span>
            </MetaRow>
          )}

          {task.childrenCount > 0 && (
            <MetaRow icon={<span className="text-[10px] font-mono">▣</span>} label="Subtasks">
              <span>{task.childrenCount}</span>
            </MetaRow>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <>
            <Separator />
            <Collapsible defaultOpen className="group/desc">
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-left">
                <ChevronRight
                  size={11}
                  className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/desc:rotate-90"
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words pl-4">
                  {stripHtml(task.description)}
                </p>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* External links */}
        {task.externalLinks.length > 0 && (
          <>
            <Separator />
            <Collapsible defaultOpen className="group/links">
              <CollapsibleTrigger className="flex w-full items-center gap-1.5 text-left">
                <ChevronRight
                  size={11}
                  className="shrink-0 text-muted-foreground transition-transform group-data-[state=open]/links:rotate-90"
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Links
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({task.externalLinks.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1.5 space-y-1 pl-4">
                  {task.externalLinks.map((link, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <LinkIcon size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline truncate block"
                          title={link.url}
                        >
                          {link.description || link.url}
                        </a>
                        {link.description && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {link.url}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Comments */}
        <Separator />
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={12} className="text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Comments
            </span>
            {comments && (
              <span className="text-[10px] text-muted-foreground">({comments.length})</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-5 w-5"
              onClick={() => refetchComments()}
            >
              <RefreshCw size={11} />
            </Button>
          </div>

          {commentsLoading ? (
            <p className="text-xs text-muted-foreground pl-0.5">Loading comments...</p>
          ) : commentsError ? (
            <p className="text-xs text-destructive pl-0.5">{commentsError.message}</p>
          ) : !comments?.length ? (
            <p className="text-xs text-muted-foreground pl-0.5">No comments yet</p>
          ) : (
            <div
              className={cn(
                'divide-y divide-border',
                'rounded border border-border bg-card/30'
              )}
            >
              {comments.map((comment) => (
                <div key={comment.id} className="px-2">
                  <CommentItem comment={comment} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskDetailPanel({ taskId, onBack }: TaskDetailProps) {
  const { data: task, isLoading, error } = useCardDetail(taskId);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onBack}>
            <ArrowLeft size={13} />
          </Button>
          <span className="font-mono text-[11px] text-muted-foreground">#{taskId}</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">Loading card...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div>
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onBack}>
            <ArrowLeft size={13} />
          </Button>
        </div>
        <div className="px-3 py-3">
          <p className="text-xs text-destructive">{error?.message ?? 'Failed to load card'}</p>
        </div>
      </div>
    );
  }

  return <DetailContent task={task} onBack={onBack} />;
}
