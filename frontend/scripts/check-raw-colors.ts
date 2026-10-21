/**
 * check-raw-colors — keeps color inside the design token system.
 *
 * Two rules:
 *
 *   1. No literal color values in code. A hex, rgb()/hsl()/oklch() call or
 *      a Tailwind arbitrary color class (`bg-[#0c0a09]`) is a bypass of
 *      the palette: it will not follow a palette swap and it will not be
 *      covered by the contrast checker.
 *
 *   2. No off-ramp Tailwind color utilities. `bg-emerald-500` compiles fine
 *      (Tailwind's default theme is still active) but that green is not in
 *      the GymTrack palette, so it silently escapes a swap. Only the four
 *      ramps declared in the @theme bridge — stone, red, teal, amber — are
 *      allowed.
 *
 *   pnpm check:colors
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(FRONTEND_ROOT, "src");

/** Files allowed to contain literal color values, and why. */
const ALLOWLIST: Record<string, string> = {
  "app/palette.css": "the palette itself — the single source of truth",
  "lib/palette.json": "the machine-readable mirror of the palette",
  // recharts paints its own default stroke/fill attributes; these selectors
  // match the attribute values so the chart can override them with tokens.
  // The colors themselves are not rendered.
  "components/ui/chart.tsx": "recharts attribute selectors, not rendered color",
};

/** Tailwind's color hue names — used to spot off-ramp utilities. */
const TAILWIND_COLOR_NAMES = new Set([
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink",
  "rose", "slate", "gray", "grey", "zinc", "neutral", "stone",
]);

/** The ramps this app defines. Anything else is off-system. */
const ALLOWED_HUES = new Set(["stone", "red", "teal", "amber"]);

const COLOR_UTILITIES =
  "bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide|caret|accent|shadow";

const RULES: ReadonlyArray<{ name: string; pattern: RegExp; label: string }> = [
  {
    name: "literal",
    pattern: /\[(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))\]/g,
    label: "Tailwind arbitrary color class",
  },
  {
    name: "literal",
    pattern: /(?<![-\w])(rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[^)"]*?\)/g,
    label: "color function literal",
  },
  {
    name: "literal",
    pattern:
      /\b(?:color|backgroundColor|borderColor|fill|stroke|outlineColor|caretColor)\s*:\s*["'](#[0-9a-fA-F]{3,8})["']/g,
    label: "inline style color literal",
  },
  {
    name: "off-ramp",
    pattern: new RegExp(`(?:${COLOR_UTILITIES})-([a-z]+)-\\d{2,3}\\b`, "g"),
    label: "off-ramp color utility",
  },
];

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      yield full;
    }
  }
}

const violations: Array<{ file: string; line: number; rule: string; label: string; text: string }> = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/");

  if (rel in ALLOWLIST) continue;

  // Test fixtures legitimately assert on concrete color strings.
  if (rel.startsWith("test/")) continue;

  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  lines.forEach((text, index) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(text)) !== null) {
        if (rule.name === "off-ramp") {
          const hue = match[1];
          if (!TAILWIND_COLOR_NAMES.has(hue)) continue;
          if (ALLOWED_HUES.has(hue)) continue;
        }
        violations.push({
          file: rel,
          line: index + 1,
          rule: rule.name,
          label: rule.label,
          text: match[0].trim(),
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log("check-raw-colors OK — no literal or off-ramp colors outside the palette");
  process.exit(0);
}

console.error(`check-raw-colors FAILED — ${violations.length} violation(s):\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.label}: ${v.text}`);
}
console.error(
  "\nUse a token instead: bg-primary / text-muted-foreground / bg-stone-950, " +
    "\nor add a semantic token to src/app/palette.css.",
);
process.exit(1);
