import { protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { modelFilePath, modelsRoot } from '@main/models/store.js';

const APP_SCHEME = 'app';

/**
 * Must be called BEFORE `app.whenReady`. Marks `app://` as a privileged
 * scheme so transformers.js + ONNX Runtime in the worker can fetch from it
 * under COOP/COEP isolation.
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
        corsEnabled: true,
      },
    },
  ]);
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.bin': 'application/octet-stream',
  '.txt': 'text/plain',
};

/**
 * Must be called AFTER `app.whenReady`.
 *
 * URL shape: `app://models/<owner>/<name>/<file>`. The handler maps to
 * `userData/models/<owner>/<name>/<file>`, refuses path traversal, and
 * streams the file using fs.createReadStream → WebReadableStream so that
 * even multi-hundred-megabyte ONNX model files arrive intact. Earlier
 * attempts via `net.fetch(file://)` + Response re-wrapping silently
 * truncated large bodies, which ORT reported as "Failed to load model
 * because protobuf parsing failed".
 *
 * Adds CORP + ACAO headers because the renderer runs under
 * `Cross-Origin-Embedder-Policy: require-corp` (needed for SharedArrayBuffer),
 * and without explicit CORP the renderer treats the response as opaque.
 */
export function registerAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url);
    if (url.host !== 'models') {
      return new Response('Not found', { status: 404 });
    }

    const decoded = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (!decoded) return new Response('Not found', { status: 404 });

    const parts = decoded.split('/');
    if (parts.length < 3) return new Response('Not found', { status: 404 });
    const repoId = `${parts[0]}/${parts[1]}`;
    const relativePath = parts.slice(2).join('/');

    if (relativePath.includes('..')) return new Response('Forbidden', { status: 403 });

    const absPath = modelFilePath(repoId, relativePath);
    if (!absPath.startsWith(modelsRoot())) {
      return new Response('Forbidden', { status: 403 });
    }

    let size: number;
    try {
      const s = await stat(absPath);
      if (!s.isFile()) {
        console.warn(`[app://] 404 (not a file) ${repoId}/${relativePath}`);
        return new Response('Not found', { status: 404 });
      }
      size = s.size;
    } catch {
      console.warn(`[app://] 404 (missing) ${repoId}/${relativePath}`);
      return new Response('Not found', { status: 404 });
    }

    const contentType = CONTENT_TYPES[extname(relativePath).toLowerCase()] ?? 'application/octet-stream';
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': String(size),
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    });

    // Honour Range requests so partial-content reads (some downstream loaders
    // request them) don't end up reading half-files.
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
      if (m) {
        const start = Number(m[1]);
        const end = m[2] && m[2].length > 0 ? Number(m[2]) : size - 1;
        if (start >= size || end >= size || start > end) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          });
        }
        const partStream = createReadStream(absPath, { start, end });
        const partBody = Readable.toWeb(partStream) as WebReadableStream;
        headers.set('Content-Length', String(end - start + 1));
        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
        return new Response(partBody as unknown as BodyInit, {
          status: 206,
          statusText: 'Partial Content',
          headers,
        });
      }
    }

    const stream = createReadStream(absPath);
    const body = Readable.toWeb(stream) as WebReadableStream;
    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers,
    });
  });
}
