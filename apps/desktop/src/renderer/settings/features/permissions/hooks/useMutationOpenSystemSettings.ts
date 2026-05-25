import { useMutation } from '@tanstack/react-query';
import { getPermissionsClient } from '@shared/hotkey/ipcClient';

export function useMutationOpenSystemSettings() {
  return useMutation<void, Error, 'microphone' | 'accessibility'>({
    mutationFn: (kind) => getPermissionsClient().open(kind),
  });
}
