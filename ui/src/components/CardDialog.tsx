import { useCardDetail } from '@/hooks/useKaitenQuery';
import { Badge } from '@/components/ui/badge';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DialogDetailContent } from '@/components/task-detail/DialogDetailContent';

interface CardDialogProps {
  taskId: number | null;
  onClose: () => void;
}

/**
 * Modal dialog that shows the full task detail for a clicked card.
 * Uses shadcn Dialog with a scrollable content area.
 */
export function CardDialog({ taskId, onClose }: CardDialogProps) {
  return (
    <Dialog open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Visually hidden title for a11y */}
        <DialogTitle className="sr-only">
          {taskId ? `Card #${taskId}` : 'Card Details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Full details for card {taskId}
        </DialogDescription>

        {taskId !== null && <CardDialogBody taskId={taskId} />}
      </DialogContent>
    </Dialog>
  );
}

function CardDialogBody({ taskId }: { taskId: number }) {
  const { data: task, isLoading, error } = useCardDetail(taskId);

  if (isLoading) {
    return (
      <Stack align="center" justify="center" spacing="2" className="py-16 px-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <Text variant="dimmed">Loading card...</Text>
      </Stack>
    );
  }

  if (error || !task) {
    return (
      <Stack align="center" justify="center" spacing="3" className="py-12 px-6">
        <Badge variant="destructive" className="px-2 py-0.5 text-xs">Error</Badge>
        <Text variant="dimmed" className="text-destructive text-center">
          {error?.message ?? 'Failed to load card'}
        </Text>
      </Stack>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 min-h-0">
      <DialogDetailContent task={task} />
    </div>
  );
}
