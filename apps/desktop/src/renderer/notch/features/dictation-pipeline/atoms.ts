import { atom } from 'jotai';
import type { TimedWord } from '@notch/features/dictation-pipeline/lib/hypothesisBuffer';

export type RecordingPhase = 'idle' | 'recording' | 'post-processing';

export interface TranscriptToken {
  text: string;
  start: number;
  end: number;
  isFinal: boolean;
}

export const recordingPhaseAtom = atom<RecordingPhase>('idle');
export const sessionIdAtom = atom<number>(0);
export const liveTokensAtom = atom<{
  committed: TimedWord[];
  tentative: TimedWord[];
}>({ committed: [], tentative: [] });
export const finalTranscriptAtom = atom<TimedWord[] | null>(null);

/** True iff the pipeline has any live or final content to render. */
export const hasAnyTokensAtom = atom((get) => {
  const live = get(liveTokensAtom);
  const final = get(finalTranscriptAtom);
  return (
    live.committed.length > 0 ||
    live.tentative.length > 0 ||
    (final != null && final.length > 0)
  );
});
