import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@mindlr/ipc-contracts';
import { registerDbHandlers, unregisterDbHandlers } from './db.js';

let _registered = false;

export function registerIpcHandlers(): void {
  if (_registered) return;
  _registered = true;
  registerDbHandlers();
}

export function unregisterIpcHandlers(): void {
  if (!_registered) return;
  _registered = false;
  unregisterDbHandlers();
  ipcMain.removeAllListeners(IPC_CHANNELS.dbChange);
}
