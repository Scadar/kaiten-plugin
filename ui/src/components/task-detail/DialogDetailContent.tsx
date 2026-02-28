import * as React from 'react';
import { AlertTriangle, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { TaskComments } from '@/components/task-detail/TaskComments';
import { TaskMeta } from '@/components/task-detail/TaskMeta';
import { CustomPropertiesSection } from '@/components/task-detail/CustomPropertiesSection';
import { CardFilesSection } from '@/components/task-detail/CardFilesSection';
import { RichTextContent } from '@/components/task-detail/RichTextContent';
import { useTaskDetailData } from '@/hooks/useTaskDetailData';
import type { TaskDetail } from '@/api/types';

interface DialogDetailContentProps {
  task: TaskDetail;
}

/**
 * Task detail body rendered inside the card dialog.
 */
export function DialogDetailContent({ task }: DialogDetailContentProps) {
  const { columnName, kaitenUrl, comments, commentsLoading, commentsError, refetchComments, allFiles } =
    useTaskDetailData(task);
  const fileUids = allFiles.map((f) => f.uid);


  return (
    <Stack>
      {/* ── Header ── */}
      <Stack direction="row" align="start" spacing="3" className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <Stack className="flex-1 min-w-0">
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
          <Text variant="subheading">{task.title}</Text>
        </Stack>

        {kaitenUrl && (
          <a
            href={kaitenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
            title="Open in Kaiten"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Open</span>
          </a>
        )}
      </Stack>

      <Stack spacing="4" className="px-4 py-3">
        {/* ── Tags ── */}
        {task.tags.length > 0 && (
          <Stack direction="row" wrap="wrap" spacing="1.5">
            {task.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="h-5 rounded-sm px-2 py-0 text-xs font-normal"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </Stack>
        )}

        {/* ── Block reason ── */}
        {task.blocked && task.blockReason && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive leading-relaxed">{task.blockReason}</p>
          </div>
        )}

        <Separator />

        {/* ── Meta ── */}
        <TaskMeta task={task} />

        {/* ── Custom Properties ── */}
        {Object.keys(task.properties).length > 0 && (
          <>
            <Separator />
            <div>
              <SectionHeading>Properties</SectionHeading>
              <div className="mt-2">
                <CustomPropertiesSection properties={task.properties} />
              </div>
            </div>
          </>
        )}

        {/* ── Description ── */}
        {task.description && (
          <>
            <Separator />
            <div>
              <SectionHeading>Description</SectionHeading>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                <RichTextContent html={task.description} excludeUids={fileUids} />
              </p>
            </div>
          </>
        )}

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
                    <LinkIcon size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block"
                        title={link.url}
                      >
                        {link.description || link.url}
                      </a>
                      {link.description && (
                        <span className="text-xs text-muted-foreground truncate block">
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
                className="text-xs text-muted-foreground hover:text-primary transition-colors truncate"
                title={kaitenUrl}
              >
                {kaitenUrl}
              </a>
            </Stack>
          </>
        )}

        {/* ── Comments ── */}
        <Separator />
        <TaskComments
          comments={comments}
          isLoading={commentsLoading}
          error={commentsError}
          onRefresh={refetchComments}
          allFiles={allFiles}
        />

        <div className="h-2" />
      </Stack>
    </Stack>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text variant="overline">{children}</Text>;
}
