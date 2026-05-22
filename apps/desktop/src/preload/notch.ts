import { contextBridge, ipcRenderer } from 'electron';
import type {
  DbQueryRequest,
  DbQueryResponse,
  DbMutateRequest,
  DbMutateResponse,
  DbChangeEvent,
  ModelsListCatalogResponse,
  ModelsProgressEvent,
  RecordingStartResponse,
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
const CHANNEL_RECORDING_START = 'recording.start';
const CHANNEL_RECORDING_STOP = 'recording.stop';
const CHANNEL_AUDIO_FRAME = 'audio.frame';
const CHANNEL_NOTCH_RESIZE = 'notch.resize';

type DbChangeListener = (event: DbChangeEvent) => void;
type ModelsProgressListener = (event: ModelsProgressEvent) => void;
type AudioFrameListener = (payload: { sampleRate: number; samples: ArrayBuffer }) => void;
type NotchPhase = 'idle' | 'recording' | 'post-processing';

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
  recording: {
    start: (): Promise<RecordingStartResponse> => ipcRenderer.invoke(CHANNEL_RECORDING_START, {}),
    stop: (): Promise<{ stopped: boolean }> => ipcRenderer.invoke(CHANNEL_RECORDING_STOP, {}),
    onAudioFrame: (listener: AudioFrameListener): (() => void) => {
      const wrapped = (
        _e: Electron.IpcRendererEvent,
        payload: { sampleRate: number; samples: ArrayBuffer },
      ) => listener(payload);
      ipcRenderer.on(CHANNEL_AUDIO_FRAME, wrapped);
      return () => ipcRenderer.off(CHANNEL_AUDIO_FRAME, wrapped);
    },
  },
  notch: {
    resize: (phase: NotchPhase): Promise<void> => ipcRenderer.invoke(CHANNEL_NOTCH_RESIZE, { phase }),
  },
} as const;

contextBridge.exposeInMainWorld('mindlr', api);

export type MindlrApi = typeof api;
