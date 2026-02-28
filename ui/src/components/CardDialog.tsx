import { DialogDetailContent } from '@/components/task-detail/DialogDetailContent';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useCardDetail } from '@/hooks/useKaitenQuery';

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
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0">
        {/* Visually hidden title for a11y */}
        <DialogTitle className="sr-only">{taskId ? `Card #${taskId}` : 'Card Details'}</DialogTitle>
        <DialogDescription className="sr-only">Full details for card {taskId}</DialogDescription>

        {taskId !== null && <CardDialogBody taskId={taskId} />}
      </DialogContent>
    </Dialog>
  );
}

function CardDialogBody({ taskId }: { taskId: number }) {
  const { data: task, isLoading, error } = useCardDetail(taskId);

  if (isLoading) {
    return (
      <Stack align="center" justify="center" spacing="2" className="px-6 py-16">
        <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        <Text variant="dimmed">Loading card...</Text>
      </Stack>
    );
  }

  if (error || !task) {
    return (
      <Stack align="center" justify="center" spacing="3" className="px-6 py-12">
        <Badge variant="destructive" className="px-2 py-0.5 text-xs">
          Error
        </Badge>
        <Text variant="dimmed" className="text-destructive text-center">
          {error?.message ?? 'Failed to load card'}
        </Text>
      </Stack>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <DialogDetailContent task={task} />
    </div>
  );
}
