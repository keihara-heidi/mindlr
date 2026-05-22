import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dbKeys } from '@shared/db/queryKeys';
import { getModelsClient } from '@shared/models/ipcClient';
import type { DownloadedModel } from '@settings/features/models/hooks/useQueryDownloadedModels';

interface Context {
  previous: DownloadedModel[] | undefined;
}

/**
 * Removes a downloaded model. Optimistically drops the row from the local
 * cache so the UI updates instantly; reverts on error.
 *
 * Main also clears the activeModelRepoId setting if it pointed at this repo,
 * so the active-id query will refetch via the `db.change` broadcast.
 */
export function useMutationDeleteModel() {
  const qc = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, string, Context>({
    mutationFn: (repoId) => getModelsClient().delete(repoId),
    onMutate: async (repoId): Promise<Context> => {
      const queryKey = dbKeys.table('models');
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<DownloadedModel[]>(queryKey);
      qc.setQueryData<DownloadedModel[]>(queryKey, (current) =>
        (current ?? []).filter((m) => m.repoId !== repoId),
      );
      return { previous };
    },
    onError: (_err, _repoId, ctx) => {
      if (ctx?.previous) qc.setQueryData(dbKeys.table('models'), ctx.previous);
    },
  });
}
