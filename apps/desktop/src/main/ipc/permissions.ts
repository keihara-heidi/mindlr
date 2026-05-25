import { ipcMain } from 'electron';
import {
  IPC_CHANNELS,
  PermissionsOpenRequestSchema,
  type PermissionsStatusResponse,
} from '@mindlr/ipc-contracts';
import { openPermissionSettings, permissionsStatus } from '@main/permissions/status.js';

export function registerPermissionsHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.permissionsStatus,
    async (): Promise<PermissionsStatusResponse> => permissionsStatus(),
  );
  ipcMain.handle(IPC_CHANNELS.permissionsOpen, async (_e, raw): Promise<void> => {
    const { kind } = PermissionsOpenRequestSchema.parse(raw);
    openPermissionSettings(kind);
  });
}

export function unregisterPermissionsHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.permissionsStatus);
  ipcMain.removeHandler(IPC_CHANNELS.permissionsOpen);
}
