import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Constant-size notch window. The inner pill animates between idle /
// recording / post-processing within these bounds via Tailwind transitions.
// Outside the visible pill the window is fully transparent and click-through.
export const NOTCH_WIDTH = 640;
export const NOTCH_HEIGHT = 64;
export const NOTCH_TOP_OFFSET = 8;

export function createNotchWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay();
  const x = Math.round(workArea.x + workArea.width / 2 - NOTCH_WIDTH / 2);
  const y = workArea.y + NOTCH_TOP_OFFSET;

  const win = new BrowserWindow({
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    alwaysOnTop: true,
    type: 'panel',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/notch.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Default: transparent area passes clicks through to whatever's behind.
  // The renderer's usePillHover hook toggles this off while the cursor is
  // inside the visible pill via the `notch.setPillHover` IPC channel.
  win.setIgnoreMouseEvents(true, { forward: true });

  win.once('ready-to-show', () => {
    win.show();
    if (process.env.ELECTRON_RENDERER_URL) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[notch] did-fail-load ${code} ${desc} ${url}`);
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[notch] render-process-gone', details);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/notch/index.html`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/notch/index.html'));
  }

  return win;
}
