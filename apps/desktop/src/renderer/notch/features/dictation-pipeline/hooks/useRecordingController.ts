import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { getDbClient } from '@shared/db/ipcClient';
import {
  finalTranscriptAtom,
  liveTokensAtom,
  recordingPhaseAtom,
  sessionIdAtom,
} from '@notch/features/dictation-pipeline/atoms';
import { clearAll } from '@notch/features/dictation-pipeline/db/dexie';
import type { TimedWord } from '@notch/features/dictation-pipeline/lib/hypothesisBuffer';
import {
  getNotchApi,
  getRecordingApi,
} from '@notch/features/dictation-pipeline/hooks/useRecordingClient';
import ProducerWorker from '@notch/features/dictation-pipeline/workers/producer.worker?worker';
import ConsumerWorker from '@notch/features/dictation-pipeline/workers/consumer.worker?worker';
import BatchWorker from '@notch/features/dictation-pipeline/workers/batch.worker?worker';

const ACTIVE_MODEL_KEY = 'activeModelRepoId';
/**
 * How long the final transcript lingers in the notch after batch finishes
 * before returning to idle. The spinner already showed while batch was
 * running; this is the lap-of-honour display. Phase 5 will inject the
 * transcript into the focused app instead — no reason to dwell here.
 */
const FINAL_DISPLAY_MS = 0;

interface ProducerInbound {
  type: 'init' | 'frame' | 'stop' | 'reset';
  [k: string]: unknown;
}
interface ConsumerInbound {
  type: 'init' | 'reset' | 'flush';
  [k: string]: unknown;
}
interface BatchInbound {
  type: 'init' | 'transcribe';
  [k: string]: unknown;
}

interface WorkerTrio {
  producer: Worker;
  consumer: Worker;
  batch: Worker;
}

/**
 * The only place that orchestrates the dictation pipeline. Toggles between
 * idle / recording / post-processing, manages worker lifecycle, and bridges
 * audio frames from main → producer worker.
 */
export function useRecordingController() {
  const [phase, setPhase] = useAtom(recordingPhaseAtom);
  const setSessionId = useSetAtom(sessionIdAtom);
  const setLiveTokens = useSetAtom(liveTokensAtom);
  const setFinalTranscript = useSetAtom(finalTranscriptAtom);
  const finalTranscript = useAtomValue(finalTranscriptAtom);

  const workersRef = useRef<WorkerTrio | null>(null);
  const initializedForRepoRef = useRef<string | null>(null);
  const audioUnsubRef = useRef<(() => void) | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const ensureWorkers = useCallback((): WorkerTrio => {
    if (workersRef.current) return workersRef.current;
    const producer = new ProducerWorker();
    const consumer = new ConsumerWorker();
    const batch = new BatchWorker();

    consumer.addEventListener('message', (ev: MessageEvent) => {
      const msg = ev.data as { type: string; committed?: TimedWord[]; tentative?: TimedWord[] };
      if (msg.type === 'tokens') {
        setLiveTokens({
          committed: msg.committed ?? [],
          tentative: msg.tentative ?? [],
        });
      } else if (msg.type === 'error') {
        console.error('[consumer]', (msg as { message?: string }).message);
      }
    });

    workersRef.current = { producer, consumer, batch };
    return workersRef.current;
  }, [setLiveTokens]);

  const waitFor = useCallback(
    <T,>(worker: Worker, predicate: (msg: T) => boolean): Promise<T> =>
      new Promise<T>((resolve) => {
        const handler = (ev: MessageEvent<T>) => {
          if (predicate(ev.data)) {
            worker.removeEventListener('message', handler);
            resolve(ev.data);
          }
        };
        worker.addEventListener('message', handler);
      }),
    [],
  );

  const readActiveModelRepoId = useCallback(async (): Promise<string | null> => {
    const { rows } = await getDbClient().query({
      table: 'settings',
      where: { key: ACTIVE_MODEL_KEY },
      limit: 1,
    });
    const row = rows[0];
    if (!row || typeof row.value !== 'string' || row.value.length === 0) return null;
    return row.value;
  }, []);

  const startRecording = useCallback(async () => {
    const repoId = await readActiveModelRepoId();
    if (!repoId) {
      toast.error('No active model', {
        description: 'Pick a model in Settings → Models to start dictating.',
      });
      return;
    }

    const { producer, consumer, batch } = ensureWorkers();
    setLiveTokens({ committed: [], tentative: [] });
    setFinalTranscript(null);
    await clearAll();

    // Reset producer/consumer state (workers stay alive across sessions).
    const resetProducer = waitFor<{ type: string }>(producer, (m) => m.type === 'reset-done');
    producer.postMessage({ type: 'reset' } satisfies ProducerInbound);
    await resetProducer;

    const resetConsumer = waitFor<{ type: string }>(consumer, (m) => m.type === 'reset-done');
    consumer.postMessage({ type: 'reset' } satisfies ConsumerInbound);
    await resetConsumer;

    // Lazy-init pipelines on first run or model change.
    if (initializedForRepoRef.current !== repoId) {
      const consumerReady = waitFor<{ type: string }>(
        consumer,
        (m) => m.type === 'ready' || m.type === 'error',
      );
      const batchReady = waitFor<{ type: string }>(
        batch,
        (m) => m.type === 'ready' || m.type === 'error',
      );
      consumer.postMessage({ type: 'init', repoId } satisfies ConsumerInbound);
      batch.postMessage({ type: 'init', repoId } satisfies BatchInbound);
      const [cR, bR] = await Promise.all([consumerReady, batchReady]);
      if (cR.type === 'error' || bR.type === 'error') {
        const msg =
          (cR as { message?: string }).message ?? (bR as { message?: string }).message ?? 'worker init failed';
        toast.error('Whisper model failed to load', { description: msg });
        return;
      }
      initializedForRepoRef.current = repoId;
    }

    // Start native capture.
    const startResp = await getRecordingApi().start();
    if (!startResp.started) {
      toast.error('Microphone unavailable', {
        description:
          startResp.error ?? 'macOS denied microphone access. Open System Settings → Privacy & Security → Microphone.',
      });
      return;
    }

    // Init producer with the actual source sample rate, then wire audio frames.
    const producerReady = waitFor<{ type: string }>(producer, (m) => m.type === 'ready');
    producer.postMessage({
      type: 'init',
      sourceSampleRate: startResp.sampleRate,
    } satisfies ProducerInbound);
    await producerReady;

    audioUnsubRef.current = getRecordingApi().onAudioFrame(({ samples }) => {
      producer.postMessage({ type: 'frame', samples } satisfies ProducerInbound, [samples]);
    });

    setSessionId((s) => s + 1);
    setPhase('recording');
    void getNotchApi().resize('recording');
  }, [
    ensureWorkers,
    readActiveModelRepoId,
    setLiveTokens,
    setFinalTranscript,
    setSessionId,
    setPhase,
    waitFor,
  ]);

  const stopRecording = useCallback(async () => {
    if (!workersRef.current) return;
    const { producer, consumer, batch } = workersRef.current;

    setPhase('post-processing');
    void getNotchApi().resize('post-processing');

    audioUnsubRef.current?.();
    audioUnsubRef.current = null;

    await getRecordingApi().stop();
    const producerStopped = waitFor<{ type: string }>(producer, (m) => m.type === 'stopped');
    producer.postMessage({ type: 'stop' } satisfies ProducerInbound);
    await producerStopped;

    const flushDone = waitFor<{ type: string }>(consumer, (m) => m.type === 'flush-done');
    consumer.postMessage({ type: 'flush' } satisfies ConsumerInbound);
    await flushDone;

    const sessionId = (workersRef.current ? performance.now() : 0) | 0;
    const transcribeResult = waitFor<{
      type: string;
      sessionId?: number;
      tokens?: TimedWord[];
      text?: string;
      durationS?: number;
      inferenceMs?: number;
      message?: string;
    }>(batch, (m) => m.type === 'transcribe-done' || m.type === 'error');
    batch.postMessage({ type: 'transcribe', sessionId } satisfies BatchInbound);
    const result = await transcribeResult;

    if (result.type === 'error') {
      console.error('[mindlr] batch transcribe failed:', result.message);
      toast.error('Final transcription failed', {
        description: result.message ?? 'unknown',
      });
      // Use whatever the live transcript captured as the fallback "final" so
      // the post-processing pill still gets a transcript to display and the
      // reset effect runs.
      setFinalTranscript([]);
      // Fall through to reset by setting an empty array — effect below
      // treats null vs empty array as "nothing to display"; we force-reset
      // explicitly here:
      setPhase('idle');
      setLiveTokens({ committed: [], tentative: [] });
      void getNotchApi().resize('idle');
      return;
    }

    console.info('[mindlr] final transcript:', {
      text: result.text,
      tokens: result.tokens?.length ?? 0,
      durationS: result.durationS,
      inferenceMs: result.inferenceMs,
    });

    setFinalTranscript(result.tokens ?? []);
    setLiveTokens({ committed: [], tentative: [] });
    // The phase → 'idle' transition is owned by the effect below so it runs
    // even if this async chain is unwound (e.g. an unmount during dev hot
    // reload). Once the atom is set, the effect schedules the reset.
  }, [setPhase, setFinalTranscript, setLiveTokens, waitFor]);

  // When a final transcript is set (even an empty array meaning "no audio
  // captured"), display it for FINAL_DISPLAY_MS then return to idle. Owning
  // the timer in an effect (rather than inside the async stopRecording chain)
  // means the reset still fires across re-mounts and cancels cleanly.
  useEffect(() => {
    if (finalTranscript === null) return;
    const t = setTimeout(() => {
      setPhase('idle');
      setFinalTranscript(null);
      void getNotchApi().resize('idle');
    }, FINAL_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [finalTranscript, setPhase, setFinalTranscript]);

  const toggleRecording = useCallback(() => {
    const guarded = async () => {
      try {
        if (phaseRef.current === 'idle') await startRecording();
        else if (phaseRef.current === 'recording') await stopRecording();
        // 'post-processing' is non-interactive — ignore clicks.
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[mindlr] toggleRecording threw:', err);
        toast.error('Something went wrong', { description: message });
      }
    };
    void guarded();
  }, [startRecording, stopRecording]);

  // Clean up workers on unmount.
  useEffect(() => {
    return () => {
      audioUnsubRef.current?.();
      audioUnsubRef.current = null;
      if (workersRef.current) {
        workersRef.current.producer.terminate();
        workersRef.current.consumer.terminate();
        workersRef.current.batch.terminate();
        workersRef.current = null;
      }
    };
  }, []);

  return { phase, toggleRecording };
}
