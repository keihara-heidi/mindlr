import { ipcMain } from 'electron';
import {
  IPC_CHANNELS,
  RecordingStartRequestSchema,
  RecordingStopRequestSchema,
  type RecordingStartResponse,
} from '@mindlr/ipc-contracts';
import { startCapture, stopCapture } from '@main/audio/capture.js';

export function registerRecordingHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.recordingStart, async (_e, raw): Promise<RecordingStartResponse> => {
    RecordingStartRequestSchema.parse(raw);
    try {
      const { sampleRate } = await startCapture();
      return { started: true, sampleRate };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[recording] start failed:', message);
      return { started: false, sampleRate: 0, error: message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.recordingStop, async (_e, raw): Promise<{ stopped: boolean }> => {
    RecordingStopRequestSchema.parse(raw);
    await stopCapture();
    return { stopped: true };
  });
}

export function unregisterRecordingHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.recordingStart);
  ipcMain.removeHandler(IPC_CHANNELS.recordingStop);
}
