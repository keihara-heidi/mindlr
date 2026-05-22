import { ipcMain, BrowserWindow, screen } from 'electron';
import { IPC_CHANNELS, NotchResizeRequestSchema } from '@mindlr/ipc-contracts';

const SIZES = {
  idle: { width: 220, height: 40 },
  recording: { width: 640, height: 64 },
  'post-processing': { width: 480, height: 40 },
} as const;

const TOP_OFFSET = 8;

/**
 * Resizes the notch window in response to phase changes from the renderer,
 * keeping it horizontally centered on the active display.
 */
export function registerNotchWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.notchResize, async (e, raw): Promise<void> => {
    const { phase } = NotchResizeRequestSchema.parse(raw);
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;

    const { width, height } = SIZES[phase];
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const workArea = display.workArea;

    win.setBounds(
      {
        width,
        height,
        x: Math.round(workArea.x + workArea.width / 2 - width / 2),
        y: workArea.y + TOP_OFFSET,
      },
      true,
    );
  });
}

export function unregisterNotchWindowHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.notchResize);
}
