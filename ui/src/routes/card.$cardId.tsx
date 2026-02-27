import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useCardDetail } from '@/hooks/useKaitenQuery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { DialogDetailContent } from '@/components/task-detail/DialogDetailContent';
import { Layout } from '@/components/Layout';

export const Route = createFileRoute('/card/$cardId')({
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const router = useRouter();
  const taskId = Number(cardId);

  return (
    <Layout
      header={
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-6 px-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.history.back()}
        >
          <ArrowLeft size={13} />
          <span className="text-xs">Back</span>
        </Button>
      }
    >
      <CardDetailBody taskId={taskId} />
    </Layout>
  );
}

function CardDetailBody({ taskId }: { taskId: number }) {
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

  return <DialogDetailContent task={task} />;
}
