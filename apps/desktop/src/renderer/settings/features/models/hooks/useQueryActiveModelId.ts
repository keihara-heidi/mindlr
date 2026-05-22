import { useQuery } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';

export const ACTIVE_MODEL_KEY = 'activeModelRepoId';

export function useQueryActiveModelId() {
  return useQuery({
    queryKey: dbKeys.row('settings', ACTIVE_MODEL_KEY),
    queryFn: async (): Promise<string | null> => {
      const { rows } = await getDbClient().query({
        table: 'settings',
        where: { key: ACTIVE_MODEL_KEY },
        limit: 1,
      });
      const row = rows[0];
      if (!row) return null;
      const value = row.value;
      return typeof value === 'string' && value.length > 0 ? value : null;
    },
    staleTime: Infinity,
  });
}
