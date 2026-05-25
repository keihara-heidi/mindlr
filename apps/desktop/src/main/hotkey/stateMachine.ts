/**
 * Hold-or-double-tap hotkey state machine.
 *
 * One trigger key supports two interaction modes simultaneously:
 *
 *   - Hold-to-talk: press and hold the key → after ~300 ms we start
 *     recording → release → stop.
 *   - Double-tap toggle: press, release, press again within ~300 ms → start
 *     recording (hands-free) → release; remains recording until the next tap
 *     of the trigger key or Escape, which stops.
 *
 * The two modes are distinguished by the same key events at runtime. Pure
 * functions only — timers are owned by the caller (listener.ts) and call
 * `tick(state, 'hold-timer' | 'tap-timer')` when they fire.
 */

export type Phase =
  | 'idle'
  | 'hold-or-tap' // key just pressed, ≤300 ms elapsed
  | 'recording-hold'
  | 'waiting-second-tap' // first tap released, awaiting second press
  | 'recording-doubletap';

export interface State {
  phase: Phase;
}

export type Event =
  | { kind: 'trigger.down' }
  | { kind: 'trigger.up' }
  | { kind: 'escape.down' }
  | { kind: 'hold-timer.fire' }
  | { kind: 'tap-timer.fire' };

export type Action =
  | { kind: 'start-recording' }
  | { kind: 'stop-recording' }
  | { kind: 'arm-hold-timer' }
  | { kind: 'cancel-hold-timer' }
  | { kind: 'arm-tap-timer' }
  | { kind: 'cancel-tap-timer' };

export interface Transition {
  next: State;
  actions: Action[];
}

export const HOLD_THRESHOLD_MS = 300;
export const TAP_WINDOW_MS = 300;

export const initialState: State = { phase: 'idle' };

export function step(state: State, event: Event): Transition {
  switch (state.phase) {
    case 'idle':
      if (event.kind === 'trigger.down') {
        return next('hold-or-tap', [{ kind: 'arm-hold-timer' }]);
      }
      return same(state);

    case 'hold-or-tap':
      if (event.kind === 'hold-timer.fire') {
        return next('recording-hold', [{ kind: 'start-recording' }]);
      }
      if (event.kind === 'trigger.up') {
        return next('waiting-second-tap', [
          { kind: 'cancel-hold-timer' },
          { kind: 'arm-tap-timer' },
        ]);
      }
      return same(state);

    case 'recording-hold':
      if (event.kind === 'trigger.up') {
        return next('idle', [{ kind: 'stop-recording' }]);
      }
      return same(state);

    case 'waiting-second-tap':
      if (event.kind === 'trigger.down') {
        return next('recording-doubletap', [
          { kind: 'cancel-tap-timer' },
          { kind: 'start-recording' },
        ]);
      }
      if (event.kind === 'tap-timer.fire') {
        // Stray single tap; nothing to do.
        return next('idle', []);
      }
      return same(state);

    case 'recording-doubletap':
      if (event.kind === 'trigger.down' || event.kind === 'escape.down') {
        return next('idle', [{ kind: 'stop-recording' }]);
      }
      return same(state);

    default:
      return same(state);
  }
}

function next(phase: Phase, actions: Action[]): Transition {
  return { next: { phase }, actions };
}

function same(state: State): Transition {
  return { next: state, actions: [] };
}
