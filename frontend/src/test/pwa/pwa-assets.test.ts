import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ROOT,
  SW_PATH,
  readManifestIconSrcs,
  readPrecacheUrls,
  verifyPwaAssets,
} from '../../../scripts/pwa-assets.mjs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('PWA assets', () => {
  it('resolves every PRECACHE_URLS and manifest icon file (cache.addAll is atomic)', () => {
    const results = verifyPwaAssets();
    expect(results.length).toBeGreaterThan(0);
    const missing = results.filter((r) => !r.ok);
    expect(missing, `missing PWA assets:\n${JSON.stringify(missing, null, 2)}`).toEqual([]);
  });

  it('precaches the offline fallback', () => {
    expect(readPrecacheUrls()).toContain('/offline.html');
  });

  it('every manifest icon is a non-empty PNG under public/', () => {
    for (const src of readManifestIconSrcs()) {
      const file = join(ROOT, 'public', src);
      const bytes = readFileSync(file);
      expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${src} is not a valid PNG`).toBe(true);
    }
  });

  it('every precache URL is an absolute same-origin path', () => {
    for (const url of readPrecacheUrls()) {
      expect(url.startsWith('/'), `PRECACHE_URLS entry must start with "/": ${url}`).toBe(true);
    }
  });

  it('sw.js carries a stamped content-hash CACHE_VERSION', () => {
    // Format guard only — freshness is enforced by `pnpm build`, which always
    // re-stamps via scripts/stamp-sw-version.mjs before next build.
    const source = readFileSync(SW_PATH, 'utf8');
    expect(source).toMatch(/^const CACHE_VERSION = '[0-9a-f]{16}';$/m);
  });
});
