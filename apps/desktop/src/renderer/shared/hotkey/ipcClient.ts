import type {
  HotkeyCaptureKeyEvent,
  PermissionsStatusResponse,
} from '@mindlr/ipc-contracts';

export interface IpcHotkeyClient {
  captureStart: () => Promise<void>;
  captureEnd: () => Promise<void>;
  onCaptureKey: (listener: (event: HotkeyCaptureKeyEvent) => void) => () => void;
}

export interface IpcPermissionsClient {
  status: () => Promise<PermissionsStatusResponse>;
  open: (kind: 'microphone' | 'accessibility') => Promise<void>;
}

interface MindlrApi {
  hotkey?: IpcHotkeyClient;
  permissions?: IpcPermissionsClient;
}

export function getHotkeyClient(): IpcHotkeyClient {
  const w = window as unknown as { mindlr?: MindlrApi };
  if (!w.mindlr?.hotkey) {
    throw new Error('window.mindlr.hotkey not available. Preload did not load.');
  }
  return w.mindlr.hotkey;
}

export function getPermissionsClient(): IpcPermissionsClient {
  const w = window as unknown as { mindlr?: MindlrApi };
  if (!w.mindlr?.permissions) {
    throw new Error('window.mindlr.permissions not available. Preload did not load.');
  }
  return w.mindlr.permissions;
}
