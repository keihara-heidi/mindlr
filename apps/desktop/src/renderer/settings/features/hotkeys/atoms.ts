import { atom } from 'jotai';
import type { HotkeyCombo } from '@mindlr/ipc-contracts';

/**
 * Live "now recording your combo…" buffer. Populated by the
 * `hotkey.captureKey` IPC event stream while capture mode is active in
 * main. Resets to null when capture ends.
 */
export const hotkeyDraftAtom = atom<HotkeyCombo | null>(null);

export const isCapturingAtom = atom<boolean>(false);
