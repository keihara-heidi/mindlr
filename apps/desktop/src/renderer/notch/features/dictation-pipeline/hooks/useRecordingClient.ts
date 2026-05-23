import type {
  ModelsListCatalogResponse,
  ModelsProgressEvent,
  RecordingStartResponse,
} from '@mindlr/ipc-contracts';

export interface RecordingApi {
  start: () => Promise<RecordingStartResponse>;
  stop: () => Promise<{ stopped: boolean }>;
  onAudioFrame: (
    listener: (payload: { sampleRate: number; samples: ArrayBuffer }) => void,
  ) => () => void;
}

export interface NotchApi {
  followActiveDisplay: () => Promise<void>;
  setPillHover: (isHovering: boolean) => Promise<void>;
}

interface MindlrApi {
  db: unknown;
  models: {
    listCatalog: () => Promise<ModelsListCatalogResponse>;
    onProgress: (l: (e: ModelsProgressEvent) => void) => () => void;
  };
  recording: RecordingApi;
  notch: NotchApi;
}

export function getRecordingApi(): RecordingApi {
  const w = window as unknown as { mindlr?: MindlrApi };
  if (!w.mindlr?.recording) {
    throw new Error('window.mindlr.recording not available. Preload did not load.');
  }
  return w.mindlr.recording;
}

export function getNotchApi(): NotchApi {
  const w = window as unknown as { mindlr?: MindlrApi };
  if (!w.mindlr?.notch) {
    throw new Error('window.mindlr.notch not available. Preload did not load.');
  }
  return w.mindlr.notch;
}
