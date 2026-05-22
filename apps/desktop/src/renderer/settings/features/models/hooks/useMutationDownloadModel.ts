import { useMutation } from '@tanstack/react-query';
import { getModelsClient } from '@shared/models/ipcClient';

/**
 * Kicks off a model download. Progress is observed separately via
 * `useModelDownloadProgress`. On success the main process inserts the row
 * into `models` and broadcasts `db.change`, which the downloaded-models
 * query picks up automatically — so no optimistic insert is needed here.
 */
export function useMutationDownloadModel() {
  return useMutation<{ started: boolean; alreadyRunning: boolean }, Error, string>({
    mutationFn: (repoId) => getModelsClient().downloadStart(repoId),
  });
}
