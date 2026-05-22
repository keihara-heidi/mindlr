import { protocol, net } from 'electron';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { modelFilePath, modelsRoot } from '@main/models/store.js';

const APP_SCHEME = 'app';

/**
 * Must be called BEFORE `app.whenReady`. Marks `app://` as a privileged scheme
 * so transformers.js can fetch from it inside the renderer.
 */
export function registerAppProtocolPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: false,
      },
    },
  ]);
}

/**
 * Must be called AFTER `app.whenReady`. Handles `app://models/<repo>/<path>`
 * by streaming the on-disk file via `net.fetch(pathToFileURL(...))`. Validates
 * the repo path stays inside `userData/models/` (no traversal).
 */
export function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    // host is the first segment after app:// — we use it as the namespace ("models")
    if (url.host !== 'models') {
      return new Response('Not found', { status: 404 });
    }

    // pathname starts with '/'. Decode and split.
    const decoded = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!decoded) return new Response('Not found', { status: 404 });

    // repoId is owner/name → first two segments
    const parts = decoded.split('/');
    if (parts.length < 3) return new Response('Not found', { status: 404 });
    const repoId = `${parts[0]}/${parts[1]}`;
    const relativePath = parts.slice(2).join('/');

    // path-traversal guard
    if (relativePath.includes('..')) return new Response('Forbidden', { status: 403 });

    const absPath = modelFilePath(repoId, relativePath);
    if (!absPath.startsWith(modelsRoot())) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!existsSync(absPath)) return new Response('Not found', { status: 404 });

    return net.fetch(pathToFileURL(absPath).toString());
  });
}
