import * as React from 'react';

import { AlertTriangle, ExternalLink, Link as LinkIcon } from 'lucide-react';

import type { TaskDetail } from '@/api/types';
import { CardFilesSection } from '@/components/task-detail/CardFilesSection';
import { CustomPropertiesSection } from '@/components/task-detail/CustomPropertiesSection';
import { RichTextContent } from '@/components/task-detail/RichTextContent';
import { TaskComments } from '@/components/task-detail/TaskComments';
import { TaskMeta } from '@/components/task-detail/TaskMeta';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
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

  return (
    <Stack>
      {/* ── Header ── */}
      <Stack
        direction="row"
        align="start"
        spacing="3"
        className="bg-card/95 border-border sticky top-0 z-10 border-b px-4 py-3 backdrop-blur-sm"
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
          <Text variant="subheading">{task.title}</Text>
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
          <div className="border-destructive/40 bg-destructive/5 flex items-start gap-2 rounded-lg border px-3 py-2">
            <AlertTriangle size={12} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-destructive text-sm leading-relaxed">{task.blockReason}</p>
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
              <p className="text-foreground/90 mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
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
