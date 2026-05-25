import { contextBridge, ipcRenderer } from 'electron';
import type {
  DbQueryRequest,
  DbQueryResponse,
  DbMutateRequest,
  DbMutateResponse,
  DbChangeEvent,
  HotkeyCaptureKeyEvent,
  ModelsListCatalogResponse,
  ModelsProgressEvent,
  PermissionsStatusResponse,
} from '@mindlr/ipc-contracts';

// Inlined to keep this preload self-contained (Electron sandboxed preloads
// must not depend on external chunk files). Mirrors @mindlr/ipc-contracts's
// IPC_CHANNELS — keep in sync.
const CHANNEL_DB_QUERY = 'db.query';
const CHANNEL_DB_MUTATE = 'db.mutate';
const CHANNEL_DB_CHANGE = 'db.change';
const CHANNEL_MODELS_LIST_CATALOG = 'models.listCatalog';
const CHANNEL_MODELS_DOWNLOAD_START = 'models.download.start';
const CHANNEL_MODELS_DOWNLOAD_CANCEL = 'models.download.cancel';
const CHANNEL_MODELS_DELETE = 'models.delete';
const CHANNEL_MODELS_PROGRESS = 'models.progress';
const CHANNEL_HOTKEY_CAPTURE_START = 'hotkey.capture.start';
const CHANNEL_HOTKEY_CAPTURE_END = 'hotkey.capture.end';
const CHANNEL_HOTKEY_CAPTURE_KEY = 'hotkey.capture.key';
const CHANNEL_PERMISSIONS_STATUS = 'permissions.status';
const CHANNEL_PERMISSIONS_OPEN = 'permissions.open';

type DbChangeListener = (event: DbChangeEvent) => void;
type ModelsProgressListener = (event: ModelsProgressEvent) => void;
type HotkeyCaptureKeyListener = (event: HotkeyCaptureKeyEvent) => void;

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
  models: {
    listCatalog: (): Promise<ModelsListCatalogResponse> =>
      ipcRenderer.invoke(CHANNEL_MODELS_LIST_CATALOG),
    downloadStart: (repoId: string): Promise<{ started: boolean; alreadyRunning: boolean }> =>
      ipcRenderer.invoke(CHANNEL_MODELS_DOWNLOAD_START, { repoId }),
    downloadCancel: (repoId: string): Promise<{ canceled: boolean }> =>
      ipcRenderer.invoke(CHANNEL_MODELS_DOWNLOAD_CANCEL, { repoId }),
    delete: (repoId: string): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke(CHANNEL_MODELS_DELETE, { repoId }),
    onProgress: (listener: ModelsProgressListener): (() => void) => {
      const wrapped = (_e: Electron.IpcRendererEvent, event: ModelsProgressEvent) =>
        listener(event);
      ipcRenderer.on(CHANNEL_MODELS_PROGRESS, wrapped);
      return () => ipcRenderer.off(CHANNEL_MODELS_PROGRESS, wrapped);
    },
  },
  hotkey: {
    captureStart: (): Promise<void> => ipcRenderer.invoke(CHANNEL_HOTKEY_CAPTURE_START),
    captureEnd: (): Promise<void> => ipcRenderer.invoke(CHANNEL_HOTKEY_CAPTURE_END),
    onCaptureKey: (listener: HotkeyCaptureKeyListener): (() => void) => {
      const wrapped = (_e: Electron.IpcRendererEvent, event: HotkeyCaptureKeyEvent) =>
        listener(event);
      ipcRenderer.on(CHANNEL_HOTKEY_CAPTURE_KEY, wrapped);
      return () => ipcRenderer.off(CHANNEL_HOTKEY_CAPTURE_KEY, wrapped);
    },
  },
  permissions: {
    status: (): Promise<PermissionsStatusResponse> =>
      ipcRenderer.invoke(CHANNEL_PERMISSIONS_STATUS),
    open: (kind: 'microphone' | 'accessibility'): Promise<void> =>
      ipcRenderer.invoke(CHANNEL_PERMISSIONS_OPEN, { kind }),
  },
} as const;

contextBridge.exposeInMainWorld('mindlr', api);

export type MindlrApi = typeof api;
