import type {
  DbQueryRequest,
  DbQueryResponse,
  DbMutateRequest,
  DbMutateResponse,
  DbChangeEvent,
  TableName,
} from '@mindlr/ipc-contracts';

export interface IpcDbClient {
  query: (req: DbQueryRequest) => Promise<DbQueryResponse>;
  mutate: (req: DbMutateRequest) => Promise<DbMutateResponse>;
  onChange: (listener: (e: DbChangeEvent) => void) => () => void;
}

export function getDbClient(): IpcDbClient {
  const w = window as unknown as { mindlr?: { db: IpcDbClient } };
  if (!w.mindlr?.db) {
    throw new Error('window.mindlr.db not available. Preload script did not load.');
  }
  return w.mindlr.db;
}

export type { TableName };
