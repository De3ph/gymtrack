/**
 * check-tokens — validates the design token system.
 *
 *   1. Parses src/app/palette.css into scopes (:root, .dark, .surface-inverted).
 *   2. Resolves every var() chain to a concrete color.
 *   3. Checks every foreground/background pair against WCAG 2.2 contrast
 *      (4.5:1 for body text, 3:1 for large text ≥24px / ≥18.66px bold).
 *   4. Checks that src/lib/palette.json (the mirror used by the manifest and
 *      the PWA icon generator) still matches the CSS.
 *
 * A palette change that breaks contrast fails here instead of shipping.
 *
 *   pnpm check:tokens
 *   pnpm check:tokens -- --strict   # also fail on the known large-text
 *                                   # exceptions listed in REQUIRED_PAIRS
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PALETTE_CSS = join(FRONTEND_ROOT, "src", "app", "palette.css");
const PALETTE_JSON = join(FRONTEND_ROOT, "src", "lib", "palette.json");

/* ── WCAG ────────────────────────────────────────────────────────────── */

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

/**
 * Pairs that must reach 4.5:1. `min` overrides the threshold for a pair that
 * is only ever used at large-text size.
 */
const REQUIRED_PAIRS: ReadonlyArray<{
  scope: string;
  bg: string;
  fg: string;
  min?: number;
  note?: string;
}> = [
  { scope: ":root", bg: "background", fg: "foreground" },
  { scope: ":root", bg: "card", fg: "card-foreground" },
  { scope: ":root", bg: "popover", fg: "popover-foreground" },
  { scope: ":root", bg: "primary", fg: "primary-foreground" },
  { scope: ":root", bg: "secondary", fg: "secondary-foreground" },
  { scope: ":root", bg: "muted", fg: "muted-foreground" },
  { scope: ":root", bg: "accent", fg: "accent-foreground" },
  { scope: ":root", bg: "destructive", fg: "destructive-foreground" },
  { scope: ":root", bg: "sidebar", fg: "sidebar-foreground" },
  { scope: ":root", bg: "sidebar-primary", fg: "sidebar-primary-foreground" },
  { scope: ":root", bg: "sidebar-accent", fg: "sidebar-accent-foreground" },

  { scope: ".dark", bg: "background", fg: "foreground" },
  { scope: ".dark", bg: "card", fg: "card-foreground" },
  { scope: ".dark", bg: "popover", fg: "popover-foreground" },
  { scope: ".dark", bg: "primary", fg: "primary-foreground" },
  { scope: ".dark", bg: "secondary", fg: "secondary-foreground" },
  { scope: ".dark", bg: "muted", fg: "muted-foreground" },
  { scope: ".dark", bg: "accent", fg: "accent-foreground" },
  { scope: ".dark", bg: "destructive", fg: "destructive-foreground" },
  { scope: ".dark", bg: "sidebar", fg: "sidebar-foreground" },
  { scope: ".dark", bg: "sidebar-primary", fg: "sidebar-primary-foreground" },
  { scope: ".dark", bg: "sidebar-accent", fg: "sidebar-accent-foreground" },

  { scope: ".surface-inverted", bg: "background", fg: "foreground" },
  { scope: ".surface-inverted", bg: "card", fg: "card-foreground" },
  { scope: ".surface-inverted", bg: "popover", fg: "popover-foreground" },
  { scope: ".surface-inverted", bg: "primary", fg: "primary-foreground" },
  { scope: ".surface-inverted", bg: "secondary", fg: "secondary-foreground" },
  { scope: ".surface-inverted", bg: "muted", fg: "muted-foreground" },
  { scope: ".surface-inverted", bg: "accent", fg: "accent-foreground" },
  { scope: ".surface-inverted", bg: "destructive", fg: "destructive-foreground" },

  // Status tokens
  { scope: ":root", bg: "success", fg: "success-foreground" },
  { scope: ":root", bg: "warning", fg: "warning-foreground" },
  { scope: ":root", bg: "info", fg: "info-foreground" },
  { scope: ".dark", bg: "success", fg: "success-foreground" },
  { scope: ".dark", bg: "warning", fg: "warning-foreground" },
  { scope: ".dark", bg: "info", fg: "info-foreground" },
];

/** Avatar swatches — every swatch carries its own label color. */
const AVATAR_SWATCHES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Pairs that are only rendered at large-text size (≥24px, or ≥18.66px bold).
 * These are reported, but only fail the run under --strict.
 */
const LARGE_TEXT_PAIRS: ReadonlyArray<{
  scope: string;
  bg: string;
  fg: string;
  note: string;
}> = [
  {
    scope: ".dark",
    bg: "primary",
    fg: "primary-foreground",
    note: "primary button label is 14px — raise --primary-foreground contrast if this is body text",
  },
  {
    scope: ".surface-inverted",
    bg: "primary",
    fg: "primary-foreground",
    note: "landing hero CTA renders at text-3xl (large text)",
  },
];

/* ── CSS parsing ─────────────────────────────────────────────────────── */

type Scope = Record<string, string>;

function parseScopes(css: string): Map<string, Scope> {
  const scopes = new Map<string, Scope>();
  // Comments carry the sRGB hex of every OKLCH step; strip them so they
  // cannot be mistaken for declarations.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");

  let cursor = 0;
  while (cursor < clean.length) {
    const open = clean.indexOf("{", cursor);
    if (open === -1) break;

    // The selector is whatever sits between the previous block boundary and
    // this brace.
    let selStart = open;
    while (selStart > 0 && !"};".includes(clean[selStart - 1])) selStart--;
    const selector = clean.slice(selStart, open).trim();

    // Matching close brace.
    let depth = 0;
    let end = open;
    for (let i = open; i < clean.length; i++) {
      if (clean[i] === "{") depth++;
      else if (clean[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    const body = clean.slice(open + 1, end);

    if (selector.startsWith("@")) {
      // Conditional group (@media, @supports) — the inner rules are
      // conditional, so they are not a palette scope. Keep scanning inside.
      cursor = open + 1;
      continue;
    }

    const vars: Scope = {};
    const varRe = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let v: RegExpExecArray | null;
    while ((v = varRe.exec(body)) !== null) {
      vars[v[1]] = v[2].trim();
    }

    if (Object.keys(vars).length > 0) {
      scopes.set(selector, { ...(scopes.get(selector) ?? {}), ...vars });
    }

    cursor = end + 1;
  }

  return scopes;
}

/** Resolve a value's var() chain against a scope, falling back to :root. */
function resolve(
  value: string,
  scope: Scope,
  root: Scope,
  depth = 0,
): string {
  if (depth > 16) return value;
  return value.replace(/var\(\s*--([a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi, (_, name, fallback) => {
    const resolved = scope[name] ?? root[name];
    if (resolved === undefined) return fallback?.trim() ?? `var(--${name})`;
    return resolve(resolved, scope, root, depth + 1);
  });
}

/* ── Color maths ────────────────────────────────────────────────────── */

type Rgb = { r: number; g: number; b: number; a: number };

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** OKLCH -> linear sRGB. */
function oklchToLinear(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function hexToLinear(hex: string): { r: number; g: number; b: number; a: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3 || h.length === 4) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r: srgbToLinear(r), g: srgbToLinear(g), b: srgbToLinear(b), a };
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
  return clamp01(v);
}

function parseColor(value: string): Rgb | null {
  const v = value.trim().toLowerCase();

  if (v.startsWith("#")) {
    const h = hexToLinear(v);
    return { ...h };
  }

  const oklch = v.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  if (oklch) {
    const L = parseFloat(oklch[1]) / (oklch[1].endsWith("%") ? 100 : 1);
    const C = parseFloat(oklch[2]) / (oklch[2].endsWith("%") ? 100 : 1);
    const H = parseFloat(oklch[3]);
    const a = oklch[4] === undefined ? 1 : parseFloat(oklch[4]) / (oklch[4].endsWith("%") ? 100 : 1);
    const lin = oklchToLinear(L, C, H);
    return { ...lin, a };
  }

  const rgb = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : parseFloat(rgb[4]) / (rgb[4].endsWith("%") ? 100 : 1);
    return {
      r: srgbToLinear(parseFloat(rgb[1]) / 255),
      g: srgbToLinear(parseFloat(rgb[2]) / 255),
      b: srgbToLinear(parseFloat(rgb[3]) / 255),
      a: alpha,
    };
  }

  return null;
}

/** Composite a translucent color over an opaque backdrop. */
function composite(color: Rgb, over: Rgb): Rgb {
  if (color.a >= 1) return color;
  return {
    r: color.r * color.a + over.r * (1 - color.a),
    g: color.g * color.a + over.g * (1 - color.a),
    b: color.b * color.a + over.b * (1 - color.a),
    a: 1,
  };
}

function luminance(c: Rgb): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function contrastRatio(fg: Rgb, bg: Rgb): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function toHex(c: Rgb): string {
  const to255 = (n: number) =>
    Math.round(linearToSrgb(n) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(c.r)}${to255(c.g)}${to255(c.b)}`;
}

/* ── Run ─────────────────────────────────────────────────────────────── */

const css = readFileSync(PALETTE_CSS, "utf8");
const scopes = parseScopes(css);
const root = scopes.get(":root") ?? {};

if (Object.keys(root).length === 0) {
  console.error("check-tokens: could not parse :root from palette.css");
  process.exit(1);
}

const strict = process.argv.includes("--strict");
const failures: string[] = [];
const warnings: string[] = [];

function checkPair(
  scopeName: string,
  bgName: string,
  fgName: string,
  min: number,
  note: string | undefined,
  fatal: boolean,
): void {
  const scope = scopes.get(scopeName) ?? {};
  const bgRaw = scope[bgName] ?? root[bgName];
  const fgRaw = scope[fgName] ?? root[fgName];

  if (bgRaw === undefined || fgRaw === undefined) {
    failures.push(`${scopeName}: missing token --${bgRaw === undefined ? bgName : fgName}`);
    return;
  }

  const bgValue = resolve(bgRaw, scope, root);
  const fgValue = resolve(fgRaw, scope, root);

  const bg = parseColor(bgValue);
  const fg = parseColor(fgValue);

  if (!bg || !fg) {
    failures.push(`${scopeName}: could not parse ${bgName}=${bgValue} / ${fgName}=${fgValue}`);
    return;
  }

  const opaqueBg = composite(bg, { r: 0, g: 0, b: 0, a: 1 });
  const ratio = contrastRatio(composite(fg, opaqueBg), opaqueBg);
  const pass = ratio >= min - 0.005;

  const label = `${scopeName} ${fgName} on ${bgName}`;
  const status = pass ? "PASS" : "FAIL";
  console.log(
    `  ${status}  ${ratio.toFixed(2).padStart(6)}:1  (min ${min.toFixed(1)})  ${label}` +
      (note ? `  — ${note}` : ""),
  );

  if (!pass) {
    const line = `${label}: ${ratio.toFixed(2)}:1 is below ${min.toFixed(1)}:1`;
    if (fatal) failures.push(line);
    else warnings.push(line);
  }
}

console.log("check-tokens — contrast\n");
for (const pair of REQUIRED_PAIRS) {
  checkPair(pair.scope, pair.bg, pair.fg, pair.min ?? AA_NORMAL, pair.note, true);
}

console.log("\ncheck-tokens — avatar swatches\n");
for (const n of AVATAR_SWATCHES) {
  checkPair(":root", `avatar-${n}`, `avatar-${n}-foreground`, AA_NORMAL, undefined, true);
}

console.log("\ncheck-tokens — large-text pairs (3:1)\n");
for (const pair of LARGE_TEXT_PAIRS) {
  checkPair(pair.scope, pair.bg, pair.fg, AA_LARGE, pair.note, strict);
}

/* JSON mirror sync */
console.log("\ncheck-tokens — palette.json mirror\n");
const mirror = JSON.parse(readFileSync(PALETTE_JSON, "utf8"));

function mirrorCheck(label: string, actual: string, expectedScope: string, expectedToken: string): void {
  const scope = scopes.get(expectedScope) ?? root;
  const raw = scope[expectedToken] ?? root[expectedToken];
  if (raw === undefined) {
    failures.push(`palette.json ${label}: no token --${expectedToken} in ${expectedScope}`);
    return;
  }
  const parsed = parseColor(resolve(raw, scope, root));
  if (!parsed) {
    failures.push(`palette.json ${label}: could not parse --${expectedToken}`);
    return;
  }
  const expected = toHex(parsed);
  const ok = expected.toLowerCase() === actual.toLowerCase();
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label} = ${actual}  (${expectedScope} --${expectedToken} = ${expected})`,
  );
  if (!ok) {
    failures.push(
      `palette.json ${label} is ${actual} but ${expectedScope} --${expectedToken} resolves to ${expected}`,
    );
  }
}

mirrorCheck("themeColor.light", mirror.themeColor.light, ":root", "background");
mirrorCheck("themeColor.dark", mirror.themeColor.dark, ".dark", "background");
mirrorCheck("manifest.backgroundColor", mirror.manifest.backgroundColor, ".dark", "background");
mirrorCheck("manifest.themeColor", mirror.manifest.themeColor, ".dark", "background");
mirrorCheck("pwaIcon.background", mirror.pwaIcon.background, ".dark", "background");
mirrorCheck("pwaIcon.glyph", mirror.pwaIcon.glyph, ".dark", "primary");

/* --print-primitives: dump every primitive as the hex the browser renders,
   so the reference comments in palette.css can be kept honest. */
if (process.argv.includes("--print-primitives")) {
  console.log("\ncheck-tokens — primitive hexes\n");
  for (const [name, value] of Object.entries(root)) {
    if (!/^(stone|red|teal|amber)-\d+$/.test(name) && !/^avatar-\d+$/.test(name)) continue;
    const parsed = parseColor(resolve(value, root, root));
    if (!parsed) continue;
    console.log(`  --${name}: ${value};   /* ${toHex(parsed)} */`);
  }
}

/* Report */
if (warnings.length > 0) {
  console.log(`\n${warnings.length} large-text pair(s) below 4.5:1 (allowed unless --strict):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (failures.length > 0) {
  console.error(`\ncheck-tokens FAILED — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\ncheck-tokens OK");
