import { clipboard } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const PASTE_SCRIPT = 'tell application "System Events" to keystroke "v" using command down';
const PASTE_WAIT_MS = 80;

/**
 * Save the current clipboard, write `text`, dispatch Cmd+V via AppleScript,
 * then restore the original clipboard. Cross-app universal, matches what
 * every macOS dictation app does.
 *
 * The 80 ms wait between paste and restore lets the focused app's paste
 * handler actually pull from the clipboard before we overwrite it. Lower
 * values race with slow apps; higher delays the perceived dictation flow.
 */
export async function pasteText(text: string): Promise<void> {
  if (text.length === 0) return;
  const previous = clipboard.readText();
  clipboard.writeText(text);
  try {
    await exec('osascript', ['-e', PASTE_SCRIPT]);
    await new Promise((r) => setTimeout(r, PASTE_WAIT_MS));
  } finally {
    clipboard.writeText(previous);
  }
}
