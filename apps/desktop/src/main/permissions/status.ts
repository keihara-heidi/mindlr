import macPerms from 'node-mac-permissions';
import { shell } from 'electron';
import type {
  PermissionStatus,
  PermissionsStatusResponse,
} from '@mindlr/ipc-contracts';

const SETTINGS_URLS: Record<'microphone' | 'accessibility', string> = {
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  accessibility:
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
};

function normalize(raw: string): PermissionStatus {
  if (raw === 'authorized') return 'authorized';
  if (raw === 'denied' || raw === 'restricted') return 'denied';
  return 'not-determined';
}

export function permissionsStatus(): PermissionsStatusResponse {
  return {
    microphone: normalize(macPerms.getAuthStatus('microphone')),
    accessibility: normalize(macPerms.getAuthStatus('accessibility')),
  };
}

export function openPermissionSettings(kind: 'microphone' | 'accessibility'): void {
  // Trigger the request flow once so the app shows up in the list if it
  // hasn't already, then open the Settings pane.
  if (kind === 'accessibility') macPerms.askForAccessibilityAccess();
  void shell.openExternal(SETTINGS_URLS[kind]);
}
