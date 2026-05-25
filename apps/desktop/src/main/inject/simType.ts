import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

/**
 * Type `text` character-by-character via AppleScript keystrokes — slower
 * than clipboard+paste but works in apps that block paste (password fields,
 * banking sites, etc.). Hidden behind the `injection.method` setting.
 *
 * AppleScript escapes: any double-quotes in the text need escaping, and
 * `\` itself becomes `\\`. Everything else is fine in `keystroke "..."`.
 */
export async function simTypeText(text: string): Promise<void> {
  if (text.length === 0) return;
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = `tell application "System Events" to keystroke "${escaped}"`;
  await exec('osascript', ['-e', script]);
}
