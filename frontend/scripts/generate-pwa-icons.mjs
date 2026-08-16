/**
 * Generates the PNG icons required for PWA installability.
 *
 * Usage: node scripts/generate-pwa-icons.mjs
 *
 * Requires `sharp` (ships with Next.js as an optional dependency; if it is
 * missing, run `pnpm add -D sharp`).
 *
 * Outputs:
 *   public/icons/icon-192.png           - manifest icon (purpose: any)
 *   public/icons/icon-512.png           - manifest icon (purpose: any)
 *   public/icons/icon-maskable-192.png  - manifest icon (purpose: maskable)
 *   public/icons/icon-maskable-512.png  - manifest icon (purpose: maskable)
 *   src/app/apple-icon.png              - apple-touch-icon via Next file convention
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Brand colors (keep in sync with src/app/globals.css). */
const BACKGROUND = '#0c0a09';
const GLYPH = '#ef4444';

/**
 * Dumbbell glyph drawn in a 512x512 coordinate space, centered.
 * Bar first so the plates render on top of it.
 */
function glyphRects() {
  return [
    // bar
    { x: 106, y: 238, w: 300, h: 36, rx: 18 },
    // inner plates
    { x: 136, y: 156, w: 54, h: 200, rx: 20 },
    { x: 322, y: 156, w: 54, h: 200, rx: 20 },
    // outer plates
    { x: 76, y: 196, w: 42, h: 120, rx: 18 },
    { x: 394, y: 196, w: 42, h: 120, rx: 18 },
  ];
}

/**
 * @param {object} opts
 * @param {number} opts.size       Output pixel size (square).
 * @param {number} opts.glyphScale Fraction of the canvas the glyph occupies.
 *                                 Maskable icons need a smaller fraction to
 *                                 stay inside the 80% safe zone.
 * @param {boolean} opts.rounded   Rounded corners (regular icons) vs full-bleed
 *                                 square (maskable / apple icons).
 */
function iconSvg({ size, glyphScale, rounded }) {
  const scale = (size * glyphScale) / 512;
  const offset = (size - 512 * scale) / 2;
  const rects = glyphRects()
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx}" fill="${GLYPH}"/>`,
    )
    .join('');
  const rx = rounded ? size * 0.1875 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BACKGROUND}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${rects}</g>
</svg>`;
}

const targets = [
  { file: 'public/icons/icon-192.png', size: 192, glyphScale: 0.74, rounded: true },
  { file: 'public/icons/icon-512.png', size: 512, glyphScale: 0.74, rounded: true },
  { file: 'public/icons/icon-maskable-192.png', size: 192, glyphScale: 0.62, rounded: false },
  { file: 'public/icons/icon-maskable-512.png', size: 512, glyphScale: 0.62, rounded: false },
  { file: 'src/app/apple-icon.png', size: 180, glyphScale: 0.72, rounded: false },
];

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp is not installed. Run: pnpm add -D sharp');
    process.exit(1);
  }

  for (const target of targets) {
    const outPath = join(root, target.file);
    await mkdir(dirname(outPath), { recursive: true });
    const svg = Buffer.from(iconSvg(target));
    await sharp(svg).png().toFile(outPath);
    console.log(`wrote ${target.file} (${target.size}x${target.size})`);
  }

  // Keep the source of truth for the favicon next to the app directory too.
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${BACKGROUND}"/>
  ${glyphRects()
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx}" fill="${GLYPH}"/>`,
    )
    .join('\n  ')}
</svg>
`;
  await writeFile(join(root, 'src/app/icon.svg'), faviconSvg, 'utf8');
  console.log('wrote src/app/icon.svg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
