// LocalAgreement-2 hypothesis buffer.
//
// Reference: Machacek, Dabre, Bojar (2023), "Turning Whisper into Real-Time
// Transcription System". Ported from off-the-record's `hypothesisBuffer.ts`
// with the model-specific filtering trimmed (we only run Whisper-family
// models). The LA-2 algorithm itself is preserved faithfully.
//
// Invariant: a word is committed only when it appears at the same position
// in two consecutive Whisper hypotheses (after 5-gram tail dedup). Once
// committed, a word is monotonically stable. It never reverts to tentative.

export interface TimedWord {
  text: string;
  start: number; // absolute time in seconds, in chunk-startedAt timeline
  end: number;
}

const STRIP_PUNCT_ASCII = new Set('.,!?;:"\'()[]-'.split(''));
const STRIP_PUNCT_CODEPOINTS = new Set([0x2013, 0x2014]);

function norm(s: string): string {
  let out = '';
  for (const ch of s.trim().toLowerCase()) {
    if (STRIP_PUNCT_ASCII.has(ch)) continue;
    if (STRIP_PUNCT_CODEPOINTS.has(ch.charCodeAt(0))) continue;
    out += ch;
  }
  return out;
}

export class HypothesisBuffer {
  private committed: TimedWord[] = [];
  private tentative: TimedWord[] = [];
  private lastCommittedTime = 0;

  /** Read-only access for the consumer's anchor advancement logic. */
  get committedWords(): readonly TimedWord[] {
    return this.committed;
  }
  get tentativeWords(): readonly TimedWord[] {
    return this.tentative;
  }
  get committedEndTime(): number {
    return this.lastCommittedTime;
  }

  /**
   * Feed a fresh hypothesis from Whisper and run one round of LocalAgreement-2.
   * Returns the words newly committed by this call.
   */
  ingest(hypothesis: TimedWord[]): TimedWord[] {
    const live = this.dropAlreadyCovered(hypothesis);
    const deduped = this.stripCommittedTailOverlap(live);
    return this.runLocalAgreement(deduped);
  }

  /** Force-commit any pending tentative words and return them. Used on stop. */
  flushTentative(): TimedWord[] {
    if (this.tentative.length === 0) return [];
    const flushed = this.tentative;
    this.committed.push(...flushed);
    if (flushed.length > 0) {
      this.lastCommittedTime = Math.max(this.lastCommittedTime, flushed.at(-1)!.end);
    }
    this.tentative = [];
    return flushed;
  }

  /**
   * Reset the buffer entirely. Used between recording sessions.
   */
  reset(): void {
    this.committed = [];
    this.tentative = [];
    this.lastCommittedTime = 0;
  }

  /**
   * Drop words whose end is at or before the last committed boundary, with a
   * 0.1 s tolerance for timestamp jitter from Whisper.
   */
  private dropAlreadyCovered(words: TimedWord[]): TimedWord[] {
    const cutoff = this.lastCommittedTime - 0.1;
    return words.filter((w) => w.end > cutoff);
  }

  /**
   * Greedy tail overlap dedup. If the head of `words` repeats the tail of the
   * committed transcript, strip the overlap. Up to 20 words deep, matching
   * the off-the-record benchmark sweet spot.
   */
  private stripCommittedTailOverlap(words: TimedWord[]): TimedWord[] {
    if (words.length === 0 || this.committed.length === 0) return words;
    if (words[0]!.start > this.lastCommittedTime + 1) return words;

    const MAX_OVERLAP_K = 20;
    const maxK = Math.min(this.committed.length, words.length, MAX_OVERLAP_K);
    for (let k = maxK; k >= 1; k--) {
      const committedTail = this.committed
        .slice(this.committed.length - k)
        .map((w) => norm(w.text))
        .join(' ');
      const newHead = words
        .slice(0, k)
        .map((w) => norm(w.text))
        .join(' ');
      if (committedTail === newHead) {
        return words.slice(k);
      }
    }
    return words;
  }

  /**
   * Core LocalAgreement-2 step. Walk `current` and `tentative` in parallel.
   * The position-wise prefix that matches between them commits.
   */
  private runLocalAgreement(current: TimedWord[]): TimedWord[] {
    if (current.length === 0) return [];

    let matchLen = 0;
    while (matchLen < current.length && matchLen < this.tentative.length) {
      if (norm(current[matchLen]!.text) !== norm(this.tentative[matchLen]!.text)) break;
      matchLen++;
    }

    const newlyCommitted = current.slice(0, matchLen);
    if (newlyCommitted.length > 0) {
      this.committed.push(...newlyCommitted);
      this.lastCommittedTime = Math.max(
        this.lastCommittedTime,
        newlyCommitted.at(-1)!.end,
      );
    }

    this.tentative = current.slice(matchLen);
    return newlyCommitted;
  }
}
