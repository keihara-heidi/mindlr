import { type RefObject, useEffect, useRef } from 'react';
import { getNotchApi } from '@notch/features/dictation-pipeline/hooks/useRecordingClient';

/**
 * Reports cursor-over-pill state to main via `notch.setPillHover` so the
 * BrowserWindow can toggle `setIgnoreMouseEvents` accordingly:
 *   cursor outside pill → window passes clicks through (forward: true so
 *     mousemove events still reach the renderer)
 *   cursor inside pill   → window accepts clicks normally
 *
 * The notch window opens with `setIgnoreMouseEvents(true, { forward: true })`
 * so mousemove events arrive even while click-through is active. We
 * hit-test the cursor against the visible pill's `getBoundingClientRect()`
 * and rAF-throttle to keep IPC chatter minimal.
 */
export function usePillHover(pillRef: RefObject<HTMLElement | null>): void {
  const isHoveringRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = (clientX: number, clientY: number) => {
      const el = pillRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const inside =
        clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      if (inside === isHoveringRef.current) return;
      isHoveringRef.current = inside;
      void getNotchApi().setPillHover(inside);
    };

    const onMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        update(clientX, clientY);
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // On unmount, make sure click-through is restored so we don't leave
      // the window in an accept-all state.
      void getNotchApi().setPillHover(false);
    };
  }, [pillRef]);
}
