import { createWriteStream } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { PassThrough, Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ModelFile } from '@mindlr/db-schema';
import { ensureRepoDir, ensureParentDir, modelFilePath, fileSize } from '@main/models/store.js';
import { requiredFiles } from '@main/models/files.js';

const HF_RESOLVE_BASE = 'https://huggingface.co';
const PROGRESS_MIN_INTERVAL_MS = 100;

export interface DownloadProgress {
  totalDownloaded: number;
  totalBytes: number;
  currentFile: string;
}

export interface DownloadOptions {
  repoId: string;
  signal: AbortSignal;
  onProgress: (p: DownloadProgress) => void;
}

export interface DownloadResult {
  files: ModelFile[];
  totalBytes: number;
}

/**
 * Downloads every file in `requiredFiles(repoId)` sequentially from HF.
 *
 * Per file:
 *   - If a complete file already exists on disk (matching Content-Length), skip.
 *   - Otherwise stream the GET response body through a PassThrough counter
 *     into `<path>.partial`, then atomic rename to the final name.
 *
 * On any error or signal abort, the in-progress `.partial` is removed and the
 * error propagates. Files already finalized in this run stay on disk so a
 * retry can resume.
 */
export async function downloadModel(opts: DownloadOptions): Promise<DownloadResult> {
  const { repoId, signal, onProgress } = opts;
  await ensureRepoDir(repoId);

  const files = requiredFiles(repoId);

  // Phase 1: HEAD every file to learn sizes (so the UI gets a real total bar).
  const sizes: number[] = [];
  let totalBytes = 0;
  for (const path of files) {
    if (signal.aborted) throw new Error('aborted');
    const url = resolveUrl(repoId, path);
    const head = await fetch(url, { method: 'HEAD', signal });
    if (!head.ok) {
      throw new Error(`HEAD ${path} failed: ${head.status} ${head.statusText}`);
    }
    const len = Number(head.headers.get('content-length') ?? '0');
    sizes.push(len);
    totalBytes += len;
  }

  // Phase 2: stream each file.
  let totalDownloaded = 0;
  const manifest: ModelFile[] = [];
  let lastEmitMs = 0;

  for (let i = 0; i < files.length; i += 1) {
    if (signal.aborted) throw new Error('aborted');
    const relPath = files[i]!;
    const expectedBytes = sizes[i]!;
    const absPath = modelFilePath(repoId, relPath);

    // Resume-skip: complete file already on disk.
    const existing = await fileSize(absPath);
    if (existing === expectedBytes && expectedBytes > 0) {
      totalDownloaded += expectedBytes;
      onProgress({ totalDownloaded, totalBytes, currentFile: relPath });
      manifest.push({ path: relPath, bytes: expectedBytes, sha256: '' });
      continue;
    }

    await ensureParentDir(absPath);
    const partialPath = `${absPath}.partial`;
    await rm(partialPath, { force: true });

    const url = resolveUrl(repoId, relPath);
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`GET ${relPath} failed: ${res.status} ${res.statusText}`);
    if (!res.body) throw new Error(`GET ${relPath} returned no body`);

    const source = Readable.fromWeb(res.body as never);
    const counter = new PassThrough();
    counter.on('data', (chunk: Buffer) => {
      totalDownloaded += chunk.length;
      const now = Date.now();
      if (now - lastEmitMs >= PROGRESS_MIN_INTERVAL_MS) {
        lastEmitMs = now;
        onProgress({ totalDownloaded, totalBytes, currentFile: relPath });
      }
    });
    const sink = createWriteStream(partialPath);

    try {
      await pipeline(source, counter, sink);
    } catch (err) {
      await rm(partialPath, { force: true });
      throw err;
    }

    await rename(partialPath, absPath);
    onProgress({ totalDownloaded, totalBytes, currentFile: relPath });
    manifest.push({ path: relPath, bytes: expectedBytes, sha256: '' });
  }

  return { files: manifest, totalBytes };
}

function resolveUrl(repoId: string, path: string): string {
  return `${HF_RESOLVE_BASE}/${repoId}/resolve/main/${path}`;
}
