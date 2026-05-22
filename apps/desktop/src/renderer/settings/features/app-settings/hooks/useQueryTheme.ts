import { useQuery } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';

export type Theme = 'light' | 'dark';
const DEFAULT_THEME: Theme = 'dark';

const THEME_KEY = 'theme';

export function useQueryTheme() {
  return useQuery({
    queryKey: dbKeys.row('settings', THEME_KEY),
    queryFn: async (): Promise<Theme> => {
      const { rows } = await getDbClient().query({
        table: 'settings',
        where: { key: THEME_KEY },
        limit: 1,
      });
      const row = rows[0];
      if (!row) return DEFAULT_THEME;
      const value = row.value;
      return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
    },
    staleTime: Infinity,
  });
}

export { THEME_KEY, DEFAULT_THEME };
