import { useQuery } from '@tanstack/react-query';
import { getModelsClient } from '@shared/models/ipcClient';

export const catalogQueryKey = ['models', 'catalog'] as const;

export function useQueryCatalog() {
  return useQuery({
    queryKey: catalogQueryKey,
    queryFn: () => getModelsClient().listCatalog(),
    staleTime: 60 * 60 * 1000, // 1h on the client too (main caches 24h)
  });
}
