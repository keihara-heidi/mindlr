import naudiodon, { type IoStreamRead } from 'naudiodon2';
import { BrowserWindow, systemPreferences } from 'electron';
import { IPC_CHANNELS } from '@mindlr/ipc-contracts';

const SAMPLE_RATE = 48_000;
const CHANNEL_COUNT = 1;
const FRAMES_PER_BUFFER = 960; // ~20 ms at 48 kHz mono Float32 (≈3.75 KB per block)

let activeStream: IoStreamRead | null = null;

export interface CaptureStartResult {
  sampleRate: number;
}

export class MicrophoneAccessDeniedError extends Error {
  constructor() {
    super('Microphone access was denied. Open System Settings → Privacy & Security → Microphone and enable Mindlr.');
    this.name = 'MicrophoneAccessDeniedError';
  }
}

/**
 * Asks macOS for microphone access via Electron's systemPreferences API.
 * On first call, this shows the TCC prompt. On subsequent calls, it resolves
 * immediately with the cached decision. naudiodon2 itself reaches CoreAudio
 * directly without triggering TCC, so we must request explicitly here.
 */
async function ensureMicrophoneAccess(): Promise<void> {
  if (process.platform !== 'darwin') return;
  const status = systemPreferences.getMediaAccessStatus('microphone');
  if (status === 'granted') return;
  const granted = await systemPreferences.askForMediaAccess('microphone');
  if (!granted) throw new MicrophoneAccessDeniedError();
}

/**
 * Opens a PortAudio (CoreAudio on macOS) Float32 mono input stream and
 * forwards each ~20 ms block to all renderers via webContents.send. Idempotent:
 * if a stream is already running, returns its sampleRate without restarting.
 */
export async function startCapture(): Promise<CaptureStartResult> {
  if (activeStream) {
    return { sampleRate: SAMPLE_RATE };
  }

  await ensureMicrophoneAccess();

  const stream = naudiodon.AudioIO({
    inOptions: {
      sampleRate: SAMPLE_RATE,
      channelCount: CHANNEL_COUNT,
      sampleFormat: naudiodon.SampleFormatFloat32,
      framesPerBuffer: FRAMES_PER_BUFFER,
      closeOnError: true,
    },
  });

  stream.on('data', (chunk: Buffer) => {
    // chunk is a Node Buffer of raw Float32 little-endian bytes. Copy into a
    // fresh ArrayBuffer (Buffer's underlying buffer may be larger and shared).
    const samples = new ArrayBuffer(chunk.byteLength);
    new Uint8Array(samples).set(
      new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
    );
    broadcastFrame(samples);
  });

  stream.on('error', (err) => {
    console.error('[audio] stream error:', err);
  });

  stream.start();
  activeStream = stream;
  return { sampleRate: SAMPLE_RATE };
}

export function stopCapture(): Promise<void> {
  if (!activeStream) return Promise.resolve();
  const s = activeStream;
  activeStream = null;
  return new Promise<void>((resolve) => {
    try {
      s.quit(() => resolve());
    } catch (err) {
      console.error('[audio] quit failed:', err);
      resolve();
    }
  });
}

function broadcastFrame(samples: ArrayBuffer): void {
  for (const win of BrowserWindow.getAllWindows()) {
    // Settings window doesn't need audio frames — only the notch hosts the
    // pipeline. Filter by URL: settings/index.html vs notch/index.html.
    const url = win.webContents.getURL();
    if (!url.includes('/notch/')) continue;
    win.webContents.send(IPC_CHANNELS.audioFrame, { sampleRate: SAMPLE_RATE, samples });
  }
}
