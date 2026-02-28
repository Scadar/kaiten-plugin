import { useCardComments, useCardFiles, useColumns } from '@/hooks/useKaitenQuery';
import { useSettings } from '@/hooks/useSettings';
import { buildKaitenUrl } from '@/lib/format';
import type { TaskDetail } from '@/api/types';

export function useTaskDetailData(task: TaskDetail) {
  const { data: columns } = useColumns(task.boardId);
  const {
    data: comments,
    isLoading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
  } = useCardComments(task.id);
  const { data: allFiles = [] } = useCardFiles(task.id);
  const settings = useSettings();

  const columnName = columns?.find((c) => c.id === task.columnId)?.name;
  const kaitenUrl  = buildKaitenUrl(settings.serverUrl, task.spaceId, task.id);

  return { columnName, kaitenUrl, comments, commentsLoading, commentsError, refetchComments, allFiles };
}
