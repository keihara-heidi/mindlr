// Lightweight pure heuristics shared by the consumer + batch workers.

const HALLUCINATION_LINE_PATTERNS: RegExp[] = [
  /^>+$/,
  /^\.+$/,
  /^[♪♫]+$/, // ♪ ♫
  /^\[.*\]$/,
  /^\(.*\)$/,
  /^thank you\.?$/i,
  /^thanks for watching\.?$/i,
  /^you$/i,
  /^bye\.?$/i,
];

export function isHallucinationLine(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (HALLUCINATION_LINE_PATTERNS.some((p) => p.test(t))) return true;
  const stripped = t
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[♪♫]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length === 0;
}

export function isHallucinationWord(word: string): boolean {
  const t = word.trim();
  if (!t) return true;
  if (/^>+$/.test(t)) return true;
  if (/^\.+$/.test(t)) return true;
  if (/^[♪♫]+$/.test(t)) return true;
  // Standalone dash artefact: any run of hyphen / en-dash / em-dash.
  for (const ch of t) {
    const c = ch.charCodeAt(0);
    if (c !== 0x2d && c !== 0x2013 && c !== 0x2014) return false;
  }
  return true;
}

export function isSentenceEnd(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const last = t[t.length - 1];
  return last === '.' || last === '?' || last === '!';
}
