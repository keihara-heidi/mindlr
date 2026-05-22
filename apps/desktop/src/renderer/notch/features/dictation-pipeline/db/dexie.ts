import Dexie, { type Table } from 'dexie';

export interface Chunk {
  id?: number;
  startS: number;
  endS: number;
  samples: Float32Array;
  speechProbability?: number;
}

export interface TranscriptRow {
  id?: number;
  idx: number;
  start: number;
  end: number;
  text: string;
  isFinal: 0 | 1;
}

class DictationDb extends Dexie {
  chunks!: Table<Chunk, number>;
  audioArchive!: Table<Chunk, number>;
  transcript!: Table<TranscriptRow, number>;

  constructor() {
    super('mindlr-dictation');
    this.version(1).stores({
      chunks: '++id, startS',
      audioArchive: '++id, startS',
      transcript: '++id, idx',
    });
  }
}

export const dictationDb = new DictationDb();

export async function clearAll(): Promise<void> {
  await Promise.all([
    dictationDb.chunks.clear(),
    dictationDb.audioArchive.clear(),
    dictationDb.transcript.clear(),
  ]);
}
