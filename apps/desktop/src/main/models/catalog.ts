import type { ModelCatalogEntry, ModelsListCatalogResponse } from '@mindlr/ipc-contracts';
import { requiredFiles } from '@main/models/files.js';
import { listWhisperTimestampedRepos } from '@main/models/hub.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const RECOMMENDED_REPO_ID = 'onnx-community/whisper-small.en_timestamped';

const FALLBACK_REPOS = [
  'onnx-community/whisper-tiny.en_timestamped',
  'onnx-community/whisper-base.en_timestamped',
  'onnx-community/whisper-small.en_timestamped',
  'onnx-community/whisper-large-v3-turbo_timestamped',
];

interface CacheEntry {
  fetchedAt: number;
  entries: ModelCatalogEntry[];
}

let cache: CacheEntry | null = null;

/**
 * Returns the recommended-and-supported model catalog.
 *
 * Strategy:
 *   1. Cached response within TTL → return as `cache`.
 *   2. Live HF query → cache + return as `hub`.
 *   3. HF unreachable / errors → return the hardcoded fallback list as `fallback`.
 */
export async function getCatalog(): Promise<ModelsListCatalogResponse> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { entries: cache.entries, source: 'cache' };
  }

  try {
    const repos = await listWhisperTimestampedRepos();
    const entries = repos.map(({ repoId }) => toEntry(repoId)).sort(byTier);
    cache = { fetchedAt: Date.now(), entries };
    return { entries, source: 'hub' };
  } catch (err) {
    console.error('[catalog] live HF query failed; serving fallback:', err);
    const entries = FALLBACK_REPOS.map(toEntry).sort(byTier);
    return { entries, source: 'fallback' };
  }
}

function toEntry(repoId: string): ModelCatalogEntry {
  return {
    repoId,
    displayName: displayNameFor(repoId),
    files: requiredFiles(repoId),
    recommended: repoId === RECOMMENDED_REPO_ID,
  };
}

/** Renders `onnx-community/whisper-small.en_timestamped` → "Whisper Small (English)". */
function displayNameFor(repoId: string): string {
  const tail = repoId.split('/').at(-1) ?? repoId;
  const name = tail.replace(/_timestamped$/, '').replace(/^whisper-/, '');
  const isEnglish = name.endsWith('.en');
  const tier = (isEnglish ? name.slice(0, -3) : name).replace(/-/g, ' ');
  const tierCap = tier
    .split(' ')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
  return `Whisper ${tierCap}${isEnglish ? ' (English)' : ''}`;
}

/**
 * Sort by tier — tiny < base < small < medium < large(-v*) < large-turbo.
 * English variants follow their multilingual sibling.
 */
function byTier(a: ModelCatalogEntry, b: ModelCatalogEntry): number {
  return tierScore(a.repoId) - tierScore(b.repoId);
}

function tierScore(repoId: string): number {
  const t = repoId.toLowerCase();
  if (t.includes('tiny')) return 1;
  if (t.includes('base')) return 2;
  if (t.includes('small')) return 3;
  if (t.includes('medium')) return 4;
  if (t.includes('turbo')) return 6;
  if (t.includes('large')) return 5;
  return 9;
}

/** For tests / cache invalidation. */
export function _resetCatalogCache(): void {
  cache = null;
}
