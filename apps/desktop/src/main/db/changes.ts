import { EventEmitter } from 'node:events';
import type { TableName } from '@mindlr/ipc-contracts';

export interface DbLocalChange {
  table: TableName;
  op: 'insert' | 'update' | 'delete' | 'upsert';
}

const emitter = new EventEmitter();

/**
 * Main-process-local pub/sub for DB mutations. The IPC `db.change`
 * broadcast goes outward to renderers via webContents.send; these helpers
 * let main-side modules react too (e.g. the hotkey listener reloading the
 * active combo when settings change).
 */
export const dbChanges = {
  on(listener: (event: DbLocalChange) => void): () => void {
    emitter.on('change', listener);
    return () => emitter.off('change', listener);
  },
  emit(event: DbLocalChange): void {
    emitter.emit('change', event);
  },
};
