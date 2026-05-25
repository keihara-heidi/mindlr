import { app, BrowserWindow } from 'electron';
import { HotkeyComboSchema } from '@mindlr/ipc-contracts';
import { getSqlite, initDb } from '@main/db/client.js';
import { dbChanges } from '@main/db/changes.js';
import { registerIpcHandlers } from '@main/ipc/index.js';
import {
  registerAppProtocol,
  registerAppProtocolPrivileges,
} from '@main/protocol/appProtocol.js';
import { createSettingsWindow } from '@main/windows/settingsWindow.js';
import { createNotchWindow } from '@main/windows/notchWindow.js';
import { setActiveCombo, startHotkeyListener } from '@main/hotkey/listener.js';

app.setName('Mindlr');

registerAppProtocolPrivileges();

function loadHotkeyComboFromDb(): void {
  try {
    const row = getSqlite()
      .prepare("SELECT value FROM settings WHERE key = 'hotkey.combo'")
      .get() as { value?: string } | undefined;
    if (!row?.value) {
      setActiveCombo(null);
      return;
    }
    const combo = HotkeyComboSchema.parse(JSON.parse(row.value));
    setActiveCombo(combo);
  } catch (err) {
    console.error('[main] failed to load hotkey combo:', err);
    setActiveCombo(null);
  }
}

async function bootstrap() {
  await app.whenReady();

  initDb();
  registerAppProtocol();
  registerIpcHandlers();

  loadHotkeyComboFromDb();
  startHotkeyListener();

  // Re-load the active combo whenever the settings table changes so a
  // re-capture in the UI takes effect immediately without restart.
  dbChanges.on((event) => {
    if (event.table === 'settings') loadHotkeyComboFromDb();
  });

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

bootstrap().catch((err) => {
  console.error('[main] bootstrap failed:', err);
  app.quit();
});
