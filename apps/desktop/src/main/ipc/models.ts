import { ipcMain, BrowserWindow } from 'electron';
import {
  IPC_CHANNELS,
  ModelsDeleteRequestSchema,
  ModelsDownloadCancelRequestSchema,
  ModelsDownloadStartRequestSchema,
  type ModelsListCatalogResponse,
  type ModelsProgressEvent,
} from '@mindlr/ipc-contracts';
import { getCatalog } from '@main/models/catalog.js';
import { downloadModel } from '@main/models/downloader.js';
import { removeRepoDir } from '@main/models/store.js';
import { getSqlite } from '@main/db/client.js';

const inFlight = new Map<string, AbortController>();

function broadcast(event: ModelsProgressEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.modelsProgress, event);
  }
}

export function registerModelsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.modelsListCatalog, async (): Promise<ModelsListCatalogResponse> => {
    return getCatalog();
  });

  ipcMain.handle(IPC_CHANNELS.modelsDownloadStart, async (_e, raw) => {
    const { repoId } = ModelsDownloadStartRequestSchema.parse(raw);

    if (inFlight.has(repoId)) {
      // Already downloading — idempotent ack.
      return { started: false, alreadyRunning: true };
    }

    const controller = new AbortController();
    inFlight.set(repoId, controller);

    broadcast({
      repoId,
      totalDownloaded: 0,
      totalBytes: 0,
      currentFile: '',
      phase: 'probing',
    });

    // Fire and forget — progress streams over the broadcast channel.
    void runDownload(repoId, controller).finally(() => {
      inFlight.delete(repoId);
    });

    return { started: true, alreadyRunning: false };
  });

  ipcMain.handle(IPC_CHANNELS.modelsDownloadCancel, async (_e, raw) => {
    const { repoId } = ModelsDownloadCancelRequestSchema.parse(raw);
    const c = inFlight.get(repoId);
    if (!c) return { canceled: false };
    c.abort();
    return { canceled: true };
  });

  ipcMain.handle(IPC_CHANNELS.modelsDelete, async (_e, raw) => {
    const { repoId } = ModelsDeleteRequestSchema.parse(raw);
    await removeRepoDir(repoId);
    const sqlite = getSqlite();
    sqlite.prepare('DELETE FROM models WHERE repo_id = ?').run(repoId);
    // Also clear active model setting if it pointed at this repo.
    sqlite
      .prepare("DELETE FROM settings WHERE key = 'activeModelRepoId' AND value = ?")
      .run(repoId);
    // Broadcast db.change so the Models tab + notch re-query.
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.dbChange, { table: 'models', op: 'delete' });
      win.webContents.send(IPC_CHANNELS.dbChange, { table: 'settings', op: 'delete' });
    }
    return { deleted: true };
  });
}

async function runDownload(repoId: string, controller: AbortController): Promise<void> {
  try {
    const { files, totalBytes } = await downloadModel({
      repoId,
      signal: controller.signal,
      onProgress: (p) => {
        broadcast({
          repoId,
          totalDownloaded: p.totalDownloaded,
          totalBytes: p.totalBytes,
          currentFile: p.currentFile,
          phase: 'downloading',
        });
      },
    });

    // Persist the model row.
    const sqlite = getSqlite();
    const now = Date.now();
    sqlite
      .prepare(
        `INSERT INTO models (repo_id, files, total_bytes, downloaded_at, last_used_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(repo_id) DO UPDATE SET
           files = excluded.files,
           total_bytes = excluded.total_bytes,
           downloaded_at = excluded.downloaded_at`,
      )
      .run(repoId, JSON.stringify(files), totalBytes, now, null);

    // Auto-set as active model if none is set yet.
    const existing = sqlite
      .prepare("SELECT value FROM settings WHERE key = 'activeModelRepoId'")
      .get() as { value?: string } | undefined;
    if (!existing?.value) {
      sqlite
        .prepare(
          `INSERT INTO settings (key, value, platform, updated_at)
           VALUES ('activeModelRepoId', ?, 'macos', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .run(repoId, now);
    }

    // Notify renderers — db.change for the models + settings tables, plus the
    // final "done" progress event so the UI can clear its in-flight state.
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.dbChange, { table: 'models', op: 'insert' });
      win.webContents.send(IPC_CHANNELS.dbChange, { table: 'settings', op: 'upsert' });
    }
    broadcast({
      repoId,
      totalDownloaded: totalBytes,
      totalBytes,
      currentFile: '',
      phase: 'done',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = message === 'aborted' || (err instanceof Error && err.name === 'AbortError');
    broadcast({
      repoId,
      totalDownloaded: 0,
      totalBytes: 0,
      currentFile: '',
      phase: isAbort ? 'canceled' : 'error',
      error: isAbort ? undefined : message,
    });
  }
}

export function unregisterModelsHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.modelsListCatalog);
  ipcMain.removeHandler(IPC_CHANNELS.modelsDownloadStart);
  ipcMain.removeHandler(IPC_CHANNELS.modelsDownloadCancel);
  ipcMain.removeHandler(IPC_CHANNELS.modelsDelete);
}
