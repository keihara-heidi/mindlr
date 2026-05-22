import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { ModelCatalogEntry } from '@mindlr/ipc-contracts';

const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ModelCatalogEntry>>[1] = {
  keys: [
    { name: 'displayName', weight: 0.7 },
    { name: 'repoId', weight: 0.3 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
};

/**
 * Filters `entries` by a fuzzy search query. Empty query returns the entries
 * untouched (and stable). The Fuse index is memoized over `entries` so it is
 * rebuilt only when the catalog changes.
 */
export function useFilteredCatalog(
  entries: ModelCatalogEntry[],
  query: string,
): ModelCatalogEntry[] {
  const fuse = useMemo(() => new Fuse(entries, FUSE_OPTIONS), [entries]);

  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return entries;
    return fuse.search(trimmed).map((r) => r.item);
  }, [fuse, entries, query]);
}
