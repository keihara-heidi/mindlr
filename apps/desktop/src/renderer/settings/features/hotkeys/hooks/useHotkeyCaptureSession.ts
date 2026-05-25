import { useCallback, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { getHotkeyClient } from '@shared/hotkey/ipcClient';
import {
  hotkeyDraftAtom,
  isCapturingAtom,
} from '@settings/features/hotkeys/atoms';
import { useMutationSetHotkeyCombo } from '@settings/features/hotkeys/hooks/useMutationSetHotkeyCombo';

/**
 * Orchestrates a single capture session:
 *   1. begin() → IPC hotkey.captureStart, subscribe to captureKey events
 *   2. each captureKey event updates hotkeyDraftAtom
 *   3. cancel() or commit() ends the session and either discards or persists
 *
 * The form's "Press to record combo" button calls begin(); the next captured
 * combo can be auto-committed (default UX) or held in the draft until the
 * user clicks Save.
 */
export function useHotkeyCaptureSession() {
  const [isCapturing, setIsCapturing] = useAtom(isCapturingAtom);
  const setDraft = useSetAtom(hotkeyDraftAtom);
  const saveCombo = useMutationSetHotkeyCombo();

  // Subscribe to captureKey events while capture is active.
  useEffect(() => {
    if (!isCapturing) return;
    const off = getHotkeyClient().onCaptureKey((event) => {
      if (event.hasKey) {
        const combo = { modifiers: event.modifiers, key: event.key };
        setDraft(combo);
        // Auto-commit on first complete combo + auto-end the session.
        saveCombo.mutate(combo);
        void getHotkeyClient().captureEnd();
        setIsCapturing(false);
      }
    });
    return off;
  }, [isCapturing, setDraft, saveCombo, setIsCapturing]);

  const begin = useCallback(async () => {
    setDraft(null);
    setIsCapturing(true);
    await getHotkeyClient().captureStart();
  }, [setDraft, setIsCapturing]);

  const cancel = useCallback(async () => {
    setIsCapturing(false);
    setDraft(null);
    await getHotkeyClient().captureEnd();
  }, [setIsCapturing, setDraft]);

  return { isCapturing, begin, cancel };
}
