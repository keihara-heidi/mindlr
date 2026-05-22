import { useEffect, useState } from 'react';
import type { ModelsProgressEvent } from '@mindlr/ipc-contracts';
import { getModelsClient } from '@shared/models/ipcClient';

export type ProgressByRepoId = ReadonlyMap<string, ModelsProgressEvent>;

/**
 * Subscribes to the main-process models.progress broadcast and exposes a
 * Map<repoId, latestEvent>. The Map identity changes on every event so React
 * detects the change.
 *
 * Terminal events (`done`, `error`, `canceled`) clear that repo's entry on
 * the next tick so the UI flips back to its steady state.
 */
export function useModelDownloadProgress(): ProgressByRepoId {
  const [progress, setProgress] = useState<Map<string, ModelsProgressEvent>>(new Map());

  useEffect(() => {
    const off = getModelsClient().onProgress((event) => {
      setProgress((prev) => {
        const next = new Map(prev);
        next.set(event.repoId, event);
        return next;
      });

      if (event.phase === 'done' || event.phase === 'error' || event.phase === 'canceled') {
        // Clear after a short delay so the UI can flash the terminal phase.
        setTimeout(() => {
          setProgress((prev) => {
            if (!prev.has(event.repoId)) return prev;
            const next = new Map(prev);
            next.delete(event.repoId);
            return next;
          });
        }, 500);
      }
    });
    return off;
  }, []);

  return progress;
}
