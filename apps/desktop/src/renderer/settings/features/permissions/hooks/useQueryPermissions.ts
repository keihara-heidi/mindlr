import { useQuery } from '@tanstack/react-query';
import type { PermissionsStatusResponse } from '@mindlr/ipc-contracts';
import { getPermissionsClient } from '@shared/hotkey/ipcClient';

export const permissionsQueryKey = ['permissions', 'status'] as const;

/**
 * Polled at 2 s — macOS doesn't broadcast permission changes; we re-query.
 * Only mounts while the Permissions card is visible, so the polling
 * footprint is small.
 */
export function useQueryPermissions() {
  return useQuery<PermissionsStatusResponse>({
    queryKey: permissionsQueryKey,
    queryFn: () => getPermissionsClient().status(),
    refetchInterval: 2_000,
    staleTime: 0,
  });
}
