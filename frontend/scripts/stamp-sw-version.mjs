/**
 * Stamps public/sw.js with an automatic CACHE_VERSION.
 *
 * The version is a content hash of:
 *   - public/sw.js itself (with the CACHE_VERSION line normalized away, so
 *     re-running is idempotent)
 *   - src/app/manifest.ts (generates /manifest.webmanifest, which is precached)
 *   - every file referenced by PRECACHE_URLS and by the manifest icons
 *
 * so any change to the worker or its precached assets produces a new byte
 * stream and the browser's SW update flow runs — no manual bumps to forget.
 * Works without git (Docker builds dockerignore .git; no dependency on
 * .next/BUILD_ID ordering either).
 *
 * Also a hard gate for PWA asset existence: `cache.addAll` fails atomically,
 * so a single missing file means the service worker never installs. Missing
 * assets fail the build BEFORE `next build` runs.
 *
 * Wired into `pnpm build`. Manual: `pnpm stamp:sw`.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { SW_PATH, readSwSource, verifyPwaAssets } from './pwa-assets.mjs';

const VERSION_LINE = /^const CACHE_VERSION = ['"][^'"]*['"];$/m;

function main() {
  // 1. Verify every referenced asset exists (issue: atomic addAll failure).
  const results = verifyPwaAssets();
  const missing = results.filter((r) => !r.ok);
  if (missing.length > 0) {
    console.error(
      'PWA asset verification failed — cache.addAll would reject and the service worker would never install:',
    );
    for (const entry of missing) {
      console.error(`  MISSING  ${entry.label}  (expected at ${entry.file})`);
    }
    process.exit(1);
  }

  // 2. Content-hash inputs. Normalize the version line first so identical
  //    inputs always produce identical output (idempotent re-runs).
  const swSource = readSwSource();
  if (!VERSION_LINE.test(swSource)) {
    console.error(
      "public/sw.js has no `const CACHE_VERSION = '...';` line at column 0 — cannot stamp.",
    );
    process.exit(1);
  }
  const normalized = swSource.replace(VERSION_LINE, "const CACHE_VERSION = '';");

  const hash = createHash('sha256').update(normalized, 'utf8');
  const hashedFiles = new Set();
  for (const entry of results) {
    if (hashedFiles.has(entry.file)) continue;
    hashedFiles.add(entry.file);
    hash.update(readFileSync(entry.file));
  }
  const version = hash.digest('hex').slice(0, 16);

  // 3. Write only when the stamp actually changes, keeping git noise out.
  const next = swSource.replace(VERSION_LINE, `const CACHE_VERSION = '${version}';`);
  if (next === swSource) {
    console.log(`public/sw.js already stamped (CACHE_VERSION=${version})`);
    return;
  }
  writeFileSync(SW_PATH, next, 'utf8');
  console.log(`stamped public/sw.js CACHE_VERSION=${version}`);
}

main();
