import { useMutation } from '@tanstack/react-query';
import { getModelsClient } from '@shared/models/ipcClient';

export function useMutationCancelDownload() {
  return useMutation<{ canceled: boolean }, Error, string>({
    mutationFn: (repoId) => getModelsClient().downloadCancel(repoId),
  });
}
