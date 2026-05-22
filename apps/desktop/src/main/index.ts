import { app, BrowserWindow } from 'electron';
import { initDb } from '@main/db/client.js';
import { registerIpcHandlers } from '@main/ipc/index.js';
import {
  registerAppProtocol,
  registerAppProtocolPrivileges,
} from '@main/protocol/appProtocol.js';
import { createSettingsWindow } from '@main/windows/settingsWindow.js';
import { createNotchWindow } from '@main/windows/notchWindow.js';

app.setName('Mindlr');

// Privileges must be registered before whenReady.
registerAppProtocolPrivileges();

async function bootstrap() {
  await app.whenReady();

  initDb();
  registerAppProtocol();
  registerIpcHandlers();

  createNotchWindow();
  let settingsWindow = createSettingsWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createNotchWindow();
      settingsWindow = createSettingsWindow();
    } else if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    } else {
      settingsWindow.show();
    }
  });
}

app.on('window-all-closed', () => {
  // Keep app running on macOS even when settings is closed; notch stays alive.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch((err) => {
  console.error('[main] bootstrap failed:', err);
  app.quit();
});
