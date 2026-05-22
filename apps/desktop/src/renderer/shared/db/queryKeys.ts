import type { TableName } from '@mindlr/ipc-contracts';

/**
 * Stable query keys for the IPC-backed TanStack Query layer.
 * Phase 2 replaces this with TanStack DB Collection-based reactive queries
 * (the collection adapter listens to `db.change` IPC events and invalidates
 * matching live queries). For Phase 1 we use TanStack Query + manual
 * invalidation via the `db.change` subscription wired in `useDbChangeSync`.
 */
export const dbKeys = {
  table: (table: TableName) => ['db', table] as const,
  row: (table: TableName, key: string) => ['db', table, key] as const,
};
