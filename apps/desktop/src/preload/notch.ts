import { contextBridge, ipcRenderer } from 'electron';
import type {
  DbQueryRequest,
  DbQueryResponse,
  DbMutateRequest,
  DbMutateResponse,
  DbChangeEvent,
} from '@mindlr/ipc-contracts';

// Inlined to keep this preload self-contained (Electron sandboxed preloads
// must not depend on external chunk files). Mirrors @mindlr/ipc-contracts's
// IPC_CHANNELS — keep in sync.
const CHANNEL_DB_QUERY = 'db.query';
const CHANNEL_DB_MUTATE = 'db.mutate';
const CHANNEL_DB_CHANGE = 'db.change';

type DbChangeListener = (event: DbChangeEvent) => void;

const api = {
  db: {
    query: (req: DbQueryRequest): Promise<DbQueryResponse> =>
      ipcRenderer.invoke(CHANNEL_DB_QUERY, req),
    mutate: (req: DbMutateRequest): Promise<DbMutateResponse> =>
      ipcRenderer.invoke(CHANNEL_DB_MUTATE, req),
    onChange: (listener: DbChangeListener): (() => void) => {
      const wrapped = (_e: Electron.IpcRendererEvent, event: DbChangeEvent) => listener(event);
      ipcRenderer.on(CHANNEL_DB_CHANGE, wrapped);
      return () => ipcRenderer.off(CHANNEL_DB_CHANGE, wrapped);
    },
  },
} as const;

contextBridge.exposeInMainWorld('mindlr', api);

export type MindlrApi = typeof api;
