import type {
  ModelsListCatalogResponse,
  ModelsProgressEvent,
} from '@mindlr/ipc-contracts';

export interface IpcModelsClient {
  listCatalog: () => Promise<ModelsListCatalogResponse>;
  downloadStart: (repoId: string) => Promise<{ started: boolean; alreadyRunning: boolean }>;
  downloadCancel: (repoId: string) => Promise<{ canceled: boolean }>;
  delete: (repoId: string) => Promise<{ deleted: boolean }>;
  onProgress: (listener: (event: ModelsProgressEvent) => void) => () => void;
}

export function getModelsClient(): IpcModelsClient {
  const w = window as unknown as { mindlr?: { models: IpcModelsClient } };
  if (!w.mindlr?.models) {
    throw new Error('window.mindlr.models not available. Preload script did not load.');
  }
  return w.mindlr.models;
}
