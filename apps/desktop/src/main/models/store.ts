import { app } from 'electron';
import { join, dirname } from 'node:path';
import { mkdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const MODELS_DIRNAME = 'models';

export function modelsRoot(): string {
  return join(app.getPath('userData'), MODELS_DIRNAME);
}

/** Absolute on-disk path for a file inside a model's repo dir. */
export function modelFilePath(repoId: string, relativePath: string): string {
  return join(modelsRoot(), repoId, relativePath);
}

/** Absolute on-disk path for the root dir of a model repo. */
export function modelRepoDir(repoId: string): string {
  return join(modelsRoot(), repoId);
}

export async function ensureRepoDir(repoId: string): Promise<void> {
  await mkdir(modelRepoDir(repoId), { recursive: true });
}

export async function ensureParentDir(absPath: string): Promise<void> {
  await mkdir(dirname(absPath), { recursive: true });
}

export async function removeRepoDir(repoId: string): Promise<void> {
  await rm(modelRepoDir(repoId), { recursive: true, force: true });
}

/** Returns the size of a file on disk, or `null` if it doesn't exist. */
export async function fileSize(absPath: string): Promise<number | null> {
  if (!existsSync(absPath)) return null;
  try {
    const s = await stat(absPath);
    return s.size;
  } catch {
    return null;
  }
}
