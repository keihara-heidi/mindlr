import type { HotkeyCombo, HotkeyModifier } from '@mindlr/ipc-contracts';

const MODIFIER_GLYPH: Record<HotkeyModifier, string> = {
  cmd: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
};

const KEY_LABEL_OVERRIDES: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Esc',
  Backspace: '⌫',
  Delete: 'Del',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  AltRight: 'Right ⌥',
  Alt: '⌥',
  Ctrl: '⌃',
  CtrlRight: 'Right ⌃',
  Shift: '⇧',
  ShiftRight: 'Right ⇧',
  Meta: '⌘',
  MetaRight: 'Right ⌘',
  Semicolon: ';',
  Equal: '=',
  Comma: ',',
  Minus: '-',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  BracketLeft: '[',
  Backslash: '\\',
  BracketRight: ']',
  Quote: '\'',
};

export function formatCombo(combo: HotkeyCombo): string {
  const mods = combo.modifiers.map((m) => MODIFIER_GLYPH[m]);
  const key = KEY_LABEL_OVERRIDES[combo.key] ?? combo.key;
  return [...mods, key].join(' ');
}
