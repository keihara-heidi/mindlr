import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const IDLE_WIDTH = 220;
const IDLE_HEIGHT = 40;
const TOP_OFFSET = 8;

export function createNotchWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay();
  const x = Math.round(workArea.x + workArea.width / 2 - IDLE_WIDTH / 2);
  const y = workArea.y + TOP_OFFSET;

  const win = new BrowserWindow({
    width: IDLE_WIDTH,
    height: IDLE_HEIGHT,
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
    vibrancy: 'under-window',
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
  win.setIgnoreMouseEvents(false);

  win.once('ready-to-show', () => win.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/notch/index.html`);
  } else {
    void win.loadFile(join(__dirname, '../renderer/notch/index.html'));
  }

  return win;
}
