import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';

/**
 * Subscribes to main-process `db.change` events and invalidates matching
 * TanStack Query keys. Mount once near the root of each renderer.
 */
export function useDbChangeSync(): void {
  const qc = useQueryClient();
  useEffect(() => {
    const off = getDbClient().onChange((e) => {
      void qc.invalidateQueries({ queryKey: dbKeys.table(e.table) });
    });
    return off;
  }, [qc]);
}
