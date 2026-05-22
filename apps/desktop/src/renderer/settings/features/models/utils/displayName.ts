/** Derives a human-readable label from an HF repo id. */
export function displayNameFromRepoId(repoId: string): string {
  const tail = repoId.split('/').at(-1) ?? repoId;
  const name = tail.replace(/_timestamped$/, '').replace(/^whisper-/, '');
  const isEnglish = name.endsWith('.en');
  const tier = (isEnglish ? name.slice(0, -3) : name).replace(/-/g, ' ');
  const tierCap = tier
    .split(' ')
    .map((w) => (w.length > 0 ? `${w[0]!.toUpperCase()}${w.slice(1)}` : w))
    .join(' ');
  return `Whisper ${tierCap}${isEnglish ? ' (English)' : ''}`;
}

/** Formats a byte count as a human-readable size, e.g. 1024 -> "1.0 KB". */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
