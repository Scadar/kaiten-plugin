import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Layout } from '@/components/Layout';
import { DialogDetailContent } from '@/components/task-detail/DialogDetailContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Stack } from '@/components/ui/stack';
import { Text } from '@/components/ui/typography';
import { useCardDetail } from '@/hooks/useKaitenQuery';

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
          className="text-muted-foreground hover:text-foreground h-6 gap-1.5 px-2"
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

  return <DialogDetailContent task={task} />;
}
