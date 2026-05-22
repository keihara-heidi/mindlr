import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';
import { ACTIVE_MODEL_KEY } from '@settings/features/models/hooks/useQueryActiveModelId';

interface Context {
  previous: string | null | undefined;
}

export function useMutationSetActiveModel() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, Context>({
    mutationFn: async (repoId) => {
      await getDbClient().mutate({
        op: 'upsert',
        table: 'settings',
        data: {
          key: ACTIVE_MODEL_KEY,
          value: repoId,
          platform: 'macos',
          updatedAt: Date.now(),
        },
        conflictKeys: ['key'],
      });
    },
    onMutate: async (repoId): Promise<Context> => {
      const queryKey = dbKeys.row('settings', ACTIVE_MODEL_KEY);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<string | null>(queryKey);
      qc.setQueryData<string | null>(queryKey, repoId);
      return { previous };
    },
    onError: (_err, _repoId, ctx) => {
      if (!ctx) return;
      qc.setQueryData(dbKeys.row('settings', ACTIVE_MODEL_KEY), ctx.previous);
    },
  });
}
