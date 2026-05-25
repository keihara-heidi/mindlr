import { UiohookKey } from 'uiohook-napi';
import type { HotkeyModifier } from '@mindlr/ipc-contracts';

const KEY_NAME_BY_KEYCODE: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const [name, code] of Object.entries(UiohookKey)) {
    if (typeof code === 'number' && !(code in out)) out[code] = name;
  }
  return out;
})();

const KEYCODE_BY_NAME: Record<string, number> = Object.fromEntries(
  Object.entries(UiohookKey).filter(([, v]) => typeof v === 'number') as [string, number][],
);

const MODIFIER_KEYCODES = new Set<number>([
  UiohookKey.Ctrl,
  UiohookKey.CtrlRight,
  UiohookKey.Alt,
  UiohookKey.AltRight,
  UiohookKey.Shift,
  UiohookKey.ShiftRight,
  UiohookKey.Meta,
  UiohookKey.MetaRight,
]);

export function keyNameFromKeycode(code: number): string | null {
  return KEY_NAME_BY_KEYCODE[code] ?? null;
}

export function keycodeFromKeyName(name: string): number | null {
  return KEYCODE_BY_NAME[name] ?? null;
}

export function isModifierKeycode(code: number): boolean {
  return MODIFIER_KEYCODES.has(code);
}

export function activeModifiers(event: {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): HotkeyModifier[] {
  const out: HotkeyModifier[] = [];
  if (event.metaKey) out.push('cmd');
  if (event.ctrlKey) out.push('ctrl');
  if (event.altKey) out.push('alt');
  if (event.shiftKey) out.push('shift');
  return out;
}
