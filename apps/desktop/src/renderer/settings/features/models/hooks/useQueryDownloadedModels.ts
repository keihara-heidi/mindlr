import { useQuery } from '@tanstack/react-query';
import { getDbClient } from '@shared/db/ipcClient';
import { dbKeys } from '@shared/db/queryKeys';

export interface DownloadedModel {
  repoId: string;
  totalBytes: number;
  downloadedAt: number;
  lastUsedAt: number | null;
}

export function useQueryDownloadedModels() {
  return useQuery({
    queryKey: dbKeys.table('models'),
    queryFn: async (): Promise<DownloadedModel[]> => {
      const { rows } = await getDbClient().query({ table: 'models' });
      return rows.map((r) => ({
        repoId: String(r.repoId),
        totalBytes: Number(r.totalBytes),
        downloadedAt: Number(r.downloadedAt),
        lastUsedAt: r.lastUsedAt === null || r.lastUsedAt === undefined ? null : Number(r.lastUsedAt),
      }));
    },
    staleTime: Infinity,
  });
}
