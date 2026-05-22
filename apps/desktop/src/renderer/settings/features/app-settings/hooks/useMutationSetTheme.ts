import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';
import { type Theme, THEME_KEY } from './useQueryTheme';

interface MutationContext {
  previous: Theme | undefined;
}

export function useMutationSetTheme() {
  const qc = useQueryClient();

  return useMutation<void, Error, Theme, MutationContext>({
    mutationFn: async (theme) => {
      await getDbClient().mutate({
        op: 'upsert',
        table: 'settings',
        data: {
          key: THEME_KEY,
          value: theme,
          platform: 'macos',
          updatedAt: Date.now(),
        },
        conflictKeys: ['key'],
      });
    },
    onMutate: async (next): Promise<MutationContext> => {
      const queryKey = dbKeys.row('settings', THEME_KEY);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<Theme>(queryKey);
      qc.setQueryData<Theme>(queryKey, next);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (!ctx) return;
      qc.setQueryData(dbKeys.row('settings', THEME_KEY), ctx.previous);
    },
  });
}
