import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@mindlr/ipc-contracts';
import { endCaptureMode, startCaptureMode } from '@main/hotkey/listener.js';

export function registerHotkeyHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.hotkeyCaptureStart, async () => {
    startCaptureMode();
  });
  ipcMain.handle(IPC_CHANNELS.hotkeyCaptureEnd, async () => {
    endCaptureMode();
  });
}

export function unregisterHotkeyHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.hotkeyCaptureStart);
  ipcMain.removeHandler(IPC_CHANNELS.hotkeyCaptureEnd);
}
