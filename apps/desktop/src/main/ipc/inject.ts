import { ipcMain } from 'electron';
import {
  IPC_CHANNELS,
  InjectTextRequestSchema,
  type InjectionMethod,
} from '@mindlr/ipc-contracts';
import { pasteText } from '@main/inject/paste.js';
import { simTypeText } from '@main/inject/simType.js';
import { getSqlite } from '@main/db/client.js';

function readMethod(): InjectionMethod {
  const sqlite = getSqlite();
  const row = sqlite
    .prepare("SELECT value FROM settings WHERE key = 'injection.method'")
    .get() as { value?: string } | undefined;
  if (row?.value === 'simType') return 'simType';
  return 'paste';
}

export function registerInjectHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.injectText, async (_e, raw): Promise<{ injected: boolean }> => {
    const { text } = InjectTextRequestSchema.parse(raw);
    if (text.length === 0) return { injected: false };
    const method = readMethod();
    try {
      if (method === 'simType') {
        await simTypeText(text);
      } else {
        await pasteText(text);
      }
      return { injected: true };
    } catch (err) {
      console.error('[inject] failed:', err);
      return { injected: false };
    }
  });
}

export function unregisterInjectHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.injectText);
}
