import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HotkeyCombo } from '@mindlr/ipc-contracts';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';
import { HOTKEY_COMBO_KEY } from '@settings/features/hotkeys/hooks/useQueryHotkeyCombo';

interface Context {
  previous: HotkeyCombo | undefined;
}

export function useMutationSetHotkeyCombo() {
  const qc = useQueryClient();
  return useMutation<void, Error, HotkeyCombo, Context>({
    mutationFn: async (combo) => {
      await getDbClient().mutate({
        op: 'upsert',
        table: 'settings',
        data: {
          key: HOTKEY_COMBO_KEY,
          value: JSON.stringify(combo),
          platform: 'macos',
          updatedAt: Date.now(),
        },
        conflictKeys: ['key'],
      });
    },
    onMutate: async (next): Promise<Context> => {
      const key = dbKeys.row('settings', HOTKEY_COMBO_KEY);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<HotkeyCombo>(key);
      qc.setQueryData<HotkeyCombo>(key, next);
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      if (!ctx) return;
      qc.setQueryData(dbKeys.row('settings', HOTKEY_COMBO_KEY), ctx.previous);
    },
  });
}
