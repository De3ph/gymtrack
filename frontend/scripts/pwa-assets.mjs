/**
 * Shared PWA asset verification.
 *
 * Why: `cache.addAll` fails atomically — one 404 in the service worker's
 * PRECACHE_URLS list and the SW never installs (no offline fallback, no
 * installability). Likewise a manifest icon 404 breaks PWA install prompts.
 *
 * Used by:
 *   - scripts/stamp-sw-version.mjs (build-time gate, `pnpm build`)
 *   - src/test/pwa/pwa-assets.test.ts (test-time gate, `pnpm test:run`)
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** frontend/ directory (this file lives in frontend/scripts/). */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SW_PATH = join(ROOT, 'public', 'sw.js');
export const MANIFEST_PATH = join(ROOT, 'src', 'app', 'manifest.ts');

/**
 * Precache entries served by Next.js itself instead of a file in public/.
 * Key: request path as it appears in PRECACHE_URLS, value: the file whose
 * existence proves the route will be served.
 */
export const GENERATED_ROUTES = {
  '/manifest.webmanifest': 'src/app/manifest.ts',
};

export function readSwSource() {
  return readFileSync(SW_PATH, 'utf8');
}

export function readManifestSource() {
  return readFileSync(MANIFEST_PATH, 'utf8');
}

/**
 * Every URL listed in `const PRECACHE_URLS = [ ... ]` in public/sw.js.
 * Resolves bare identifiers (e.g. `OFFLINE_URL`) against their declarations.
 */
export function readPrecacheUrls(swSource = readSwSource()) {
  const arrayMatch = swSource.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  if (!arrayMatch) {
    throw new Error('Could not find `const PRECACHE_URLS = [ ... ];` in public/sw.js');
  }
  const body = arrayMatch[1].replace(/\/\/[^\n]*/g, '');
  const tokens = body.match(/['"][^'"]+['"]|[A-Za-z_$][\w$]*/g) ?? [];
  const urls = [];
  for (const token of tokens) {
    if (token.startsWith("'") || token.startsWith('"')) {
      urls.push(token.slice(1, -1));
      continue;
    }
    const declaration = swSource.match(
      new RegExp(`const ${token.replace(/[$]/g, '\\$&')} = ['"]([^'"]+)['"]`),
    );
    if (!declaration) {
      throw new Error(
        `PRECACHE_URLS entry \`${token}\` is neither a string literal nor a resolvable \`const X = '...'\` declaration`,
      );
    }
    urls.push(declaration[1]);
  }
  if (urls.length === 0) {
    throw new Error('PRECACHE_URLS in public/sw.js resolved to zero URLs');
  }
  return urls;
}

/** Every icon `src` declared in src/app/manifest.ts. */
export function readManifestIconSrcs(manifestSource = readManifestSource()) {
  const srcs = [...manifestSource.matchAll(/src:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (srcs.length === 0) {
    throw new Error('No icon `src` entries found in src/app/manifest.ts');
  }
  return srcs;
}

/**
 * Checks every file the PWA depends on: precache URLs (mapped to public/ or
 * their generator file) plus all manifest icons.
 *
 * @returns {{ label: string, file: string, ok: boolean }[]}
 */
export function verifyPwaAssets() {
  const swSource = readSwSource();

  /** @type {{ label: string, file: string }[]} */
  const entries = [];
  const seen = new Set();
  const add = (label, file) => {
    const key = `${label}\0${file}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ label, file });
  };

  for (const url of readPrecacheUrls(swSource)) {
    if (!url.startsWith('/')) {
      throw new Error(`PRECACHE_URLS entry must be an absolute same-origin path: ${url}`);
    }
    const generated = GENERATED_ROUTES[url];
    add(`precache ${url}`, generated ? join(ROOT, generated) : join(ROOT, 'public', url));
  }

  if (existsSync(MANIFEST_PATH)) {
    for (const src of readManifestIconSrcs()) {
      add(`manifest icon ${src}`, join(ROOT, 'public', src));
    }
  } else {
    add('manifest source', MANIFEST_PATH);
  }

  return entries.map((entry) => ({
    ...entry,
    ok: existsSync(entry.file) && statSync(entry.file).size > 0,
  }));
}
