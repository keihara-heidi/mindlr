import { BrowserWindow } from 'electron';
import { uIOhook, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi';
import {
  IPC_CHANNELS,
  type HotkeyCaptureKeyEvent,
  type HotkeyCombo,
  type RecordingTriggerEvent,
} from '@mindlr/ipc-contracts';
import {
  HOLD_THRESHOLD_MS,
  TAP_WINDOW_MS,
  initialState,
  step,
  type Action,
  type State,
} from '@main/hotkey/stateMachine.js';
import {
  activeModifiers,
  isModifierKeycode,
  keyNameFromKeycode,
  keycodeFromKeyName,
} from '@main/hotkey/keymap.js';

let started = false;
let state: State = initialState;
let holdTimer: NodeJS.Timeout | null = null;
let tapTimer: NodeJS.Timeout | null = null;

let activeCombo: HotkeyCombo | null = null;
let captureMode = false;

const ESCAPE_KEYCODE = UiohookKey.Escape;

function broadcastTrigger(event: RecordingTriggerEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    const url = win.webContents.getURL();
    if (!url.includes('/notch/')) continue;
    win.webContents.send(IPC_CHANNELS.recordingTrigger, event);
  }
}

function broadcastCaptureKey(event: HotkeyCaptureKeyEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.hotkeyCaptureKey, event);
  }
}

function applyActions(actions: Action[]): void {
  for (const a of actions) {
    switch (a.kind) {
      case 'start-recording':
        broadcastTrigger({ kind: 'start' });
        break;
      case 'stop-recording':
        broadcastTrigger({ kind: 'stop' });
        break;
      case 'arm-hold-timer':
        clearHold();
        holdTimer = setTimeout(() => {
          holdTimer = null;
          drive({ kind: 'hold-timer.fire' });
        }, HOLD_THRESHOLD_MS);
        break;
      case 'cancel-hold-timer':
        clearHold();
        break;
      case 'arm-tap-timer':
        clearTap();
        tapTimer = setTimeout(() => {
          tapTimer = null;
          drive({ kind: 'tap-timer.fire' });
        }, TAP_WINDOW_MS);
        break;
      case 'cancel-tap-timer':
        clearTap();
        break;
    }
  }
}

function clearHold(): void {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

function clearTap(): void {
  if (tapTimer) {
    clearTimeout(tapTimer);
    tapTimer = null;
  }
}

function drive(event: Parameters<typeof step>[1]): void {
  const { next, actions } = step(state, event);
  state = next;
  applyActions(actions);
}

function matchesCombo(combo: HotkeyCombo, e: UiohookKeyboardEvent): boolean {
  const keycode = keycodeFromKeyName(combo.key);
  if (keycode == null || e.keycode !== keycode) return false;
  // Required modifiers must all be held; extra modifiers don't disqualify
  // (the user may have shift held for capitalization, etc., when the combo
  // is a modifier-less single key — we still want the trigger). For
  // modifier-key triggers (AltRight), `combo.modifiers` is empty so this
  // always matches.
  const have = new Set(activeModifiers(e));
  for (const m of combo.modifiers) if (!have.has(m)) return false;
  return true;
}

function onKeydown(e: UiohookKeyboardEvent): void {
  if (captureMode) {
    handleCaptureDown(e);
    return;
  }
  if (!activeCombo) return;
  if (e.keycode === ESCAPE_KEYCODE) {
    drive({ kind: 'escape.down' });
    return;
  }
  if (matchesCombo(activeCombo, e)) {
    drive({ kind: 'trigger.down' });
  }
}

function onKeyup(e: UiohookKeyboardEvent): void {
  if (captureMode) return;
  if (!activeCombo) return;
  if (matchesCombo(activeCombo, e)) {
    drive({ kind: 'trigger.up' });
  }
}

function handleCaptureDown(e: UiohookKeyboardEvent): void {
  const name = keyNameFromKeycode(e.keycode);
  if (name == null) return;
  const mods = activeModifiers(e);
  // Non-modifier key with modifiers present = a complete combo. Modifier-
  // only key alone = also a valid combo (e.g. AltRight). Either way we send
  // hasKey: true if the key isn't acting purely as a held modifier waiting
  // for the real key.
  const isModifier = isModifierKeycode(e.keycode);
  if (isModifier) {
    // Modifier-only press: still send so the form can display "Alt", but
    // only mark hasKey: true if the press matches a known modifier-key name
    // that we treat as a complete combo (e.g. AltRight on its own).
    broadcastCaptureKey({ modifiers: mods, key: name, hasKey: true });
  } else {
    broadcastCaptureKey({ modifiers: mods, key: name, hasKey: true });
  }
}

export function setActiveCombo(combo: HotkeyCombo | null): void {
  activeCombo = combo;
  // Reset state machine when the combo changes so a stale held key doesn't
  // resolve into a recording trigger against the new combo.
  resetMachine();
}

export function startCaptureMode(): void {
  captureMode = true;
  resetMachine();
}

export function endCaptureMode(): void {
  captureMode = false;
  resetMachine();
}

function resetMachine(): void {
  clearHold();
  clearTap();
  state = initialState;
}

export function startHotkeyListener(): void {
  if (started) return;
  started = true;
  uIOhook.on('keydown', onKeydown);
  uIOhook.on('keyup', onKeyup);
  uIOhook.start();
}

export function stopHotkeyListener(): void {
  if (!started) return;
  started = false;
  uIOhook.removeListener('keydown', onKeydown);
  uIOhook.removeListener('keyup', onKeyup);
  uIOhook.stop();
  resetMachine();
}
