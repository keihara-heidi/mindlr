import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@mindlr/ipc-contracts';
import { registerDbHandlers, unregisterDbHandlers } from '@main/ipc/db.js';
import { registerModelsHandlers, unregisterModelsHandlers } from '@main/ipc/models.js';
import { registerRecordingHandlers, unregisterRecordingHandlers } from '@main/ipc/recording.js';
import {
  registerNotchWindowHandlers,
  unregisterNotchWindowHandlers,
} from '@main/ipc/notchWindow.js';
import { registerHotkeyHandlers, unregisterHotkeyHandlers } from '@main/ipc/hotkey.js';
import { registerInjectHandlers, unregisterInjectHandlers } from '@main/ipc/inject.js';
import {
  registerPermissionsHandlers,
  unregisterPermissionsHandlers,
} from '@main/ipc/permissions.js';

let _registered = false;

export function registerIpcHandlers(): void {
  if (_registered) return;
  _registered = true;
  registerDbHandlers();
  registerModelsHandlers();
  registerRecordingHandlers();
  registerNotchWindowHandlers();
  registerHotkeyHandlers();
  registerInjectHandlers();
  registerPermissionsHandlers();
}

export function unregisterIpcHandlers(): void {
  if (!_registered) return;
  _registered = false;
  unregisterDbHandlers();
  unregisterModelsHandlers();
  unregisterRecordingHandlers();
  unregisterNotchWindowHandlers();
  unregisterHotkeyHandlers();
  unregisterInjectHandlers();
  unregisterPermissionsHandlers();
  ipcMain.removeAllListeners(IPC_CHANNELS.dbChange);
  ipcMain.removeAllListeners(IPC_CHANNELS.modelsProgress);
  ipcMain.removeAllListeners(IPC_CHANNELS.audioFrame);
  ipcMain.removeAllListeners(IPC_CHANNELS.hotkeyCaptureKey);
  ipcMain.removeAllListeners(IPC_CHANNELS.recordingTrigger);
}
