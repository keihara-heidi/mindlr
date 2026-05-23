import { ipcMain, BrowserWindow, screen } from 'electron';
import { IPC_CHANNELS, NotchSetPillHoverRequestSchema } from '@mindlr/ipc-contracts';
import {
  NOTCH_HEIGHT,
  NOTCH_TOP_OFFSET,
  NOTCH_WIDTH,
} from '@main/windows/notchWindow.js';

/**
 * Handlers for the constant-size notch window (Phase 4).
 *
 * - `notch.followActiveDisplay`: repositions the window horizontally-centred
 *   at the top of the display nearest the cursor. Cursor is a proxy for
 *   "where the user is working" — adequate for v1.
 *
 * - `notch.setPillHover`: when the renderer's cursor-hover detector reports
 *   the cursor is inside the visible pill, switch the window off click-
 *   through so the Mic/Stop buttons register normally. When the cursor
 *   leaves, restore click-through with `forward: true` so the renderer
 *   keeps receiving mousemove events.
 */
export function registerNotchWindowHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.notchFollowActiveDisplay, (e): void => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    const point = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(point);
    const { workArea } = display;
    win.setBounds({
      width: NOTCH_WIDTH,
      height: NOTCH_HEIGHT,
      x: Math.round(workArea.x + workArea.width / 2 - NOTCH_WIDTH / 2),
      y: workArea.y + NOTCH_TOP_OFFSET,
    });
  });

  ipcMain.handle(IPC_CHANNELS.notchSetPillHover, (e, raw): void => {
    const { isHovering } = NotchSetPillHoverRequestSchema.parse(raw);
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (isHovering) {
      win.setIgnoreMouseEvents(false);
    } else {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  });
}

export function unregisterNotchWindowHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.notchFollowActiveDisplay);
  ipcMain.removeHandler(IPC_CHANNELS.notchSetPillHover);
}
