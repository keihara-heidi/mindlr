import { useQuery } from '@tanstack/react-query';
import { HotkeyComboSchema, type HotkeyCombo } from '@mindlr/ipc-contracts';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';

export const HOTKEY_COMBO_KEY = 'hotkey.combo';
const DEFAULT_COMBO: HotkeyCombo = { modifiers: [], key: 'AltRight' };

export function useQueryHotkeyCombo() {
  return useQuery({
    queryKey: dbKeys.row('settings', HOTKEY_COMBO_KEY),
    queryFn: async (): Promise<HotkeyCombo> => {
      const { rows } = await getDbClient().query({
        table: 'settings',
        where: { key: HOTKEY_COMBO_KEY },
        limit: 1,
      });
      const row = rows[0];
      if (!row || typeof row.value !== 'string') return DEFAULT_COMBO;
      try {
        return HotkeyComboSchema.parse(JSON.parse(row.value));
      } catch {
        return DEFAULT_COMBO;
      }
    },
    staleTime: Infinity,
  });
}

export { DEFAULT_COMBO };
