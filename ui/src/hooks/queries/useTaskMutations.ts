import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { tasksKeys } from '@/api/endpoints';
import type { TaskDetail, UpdateCardInput } from '@/api/types';
import { useApiClient } from '@/hooks/useApiClient';

// ── Update card fields (title, description, due_date, owner_id, tag_ids) ────

export function useUpdateCard(cardId: number) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateCardInput) => client!.updateCard(cardId, updates),

    onMutate: async (updates) => {
      // Cancel any in-flight queries so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: tasksKeys.detailExtended(cardId) });

      // Snapshot for rollback
      const prev = queryClient.getQueryData<TaskDetail>(tasksKeys.detailExtended(cardId));

      // Optimistic update — map snake_case API fields to domain camelCase
      queryClient.setQueryData<TaskDetail>(tasksKeys.detailExtended(cardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.due_date !== undefined && { dueDate: updates.due_date }),
          ...(updates.owner_id !== undefined && { assigneeId: updates.owner_id }),
          ...(updates.tag_ids !== undefined && {
            tags: old.tags.filter((t) => updates.tag_ids!.includes(t.id)),
          }),
        };
      });

      return { prev };
    },

    onError: (_err, _vars, context) => {
      // Roll back
      if (context?.prev) {
        queryClient.setQueryData(tasksKeys.detailExtended(cardId), context.prev);
      }
      toast.error('Failed to save changes. Please try again.');
    },

    onSuccess: (updated) => {
      // Patch in the server response (authoritative)
      queryClient.setQueryData<TaskDetail>(tasksKeys.detailExtended(cardId), updated);
    },

    onSettled: () => {
      // Always refetch for authoritative server state
      void queryClient.invalidateQueries({ queryKey: tasksKeys.detail(cardId) });
    },
  });
}

// ── Update a custom property value ───────────────────────────────────────────

export function useUpdateCardProperty(cardId: number) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, value }: { propertyId: number; value: unknown }) =>
      client!.updateCardProperty(cardId, propertyId, value),

    onMutate: async ({ propertyId, value }) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.detailExtended(cardId) });

      const prev = queryClient.getQueryData<TaskDetail>(tasksKeys.detailExtended(cardId));

      // Optimistic: update the property map
      queryClient.setQueryData<TaskDetail>(tasksKeys.detailExtended(cardId), (old) => {
        if (!old) return old;
        return {
          ...old,
          properties: { ...old.properties, [`id_${propertyId}`]: value },
        };
      });

      return { prev };
    },

    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(tasksKeys.detailExtended(cardId), context.prev);
      }
      toast.error('Failed to save property. Please try again.');
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.detailExtended(cardId) });
    },
  });
}
