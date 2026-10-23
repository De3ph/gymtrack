import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guard for the LazyMotion contract.
 *
 * Components import their elements from `motion/react-m` (`m.*`) instead of
 * `motion/react` (`motion.*`). The `m` build ships no animation features of
 * its own - it reads them from the nearest `LazyMotion` provider. A `m.*`
 * element rendered without that provider does NOT crash: it renders, and
 * silently never animates. That is the failure mode this test exists to
 * prevent.
 *
 * The check walks the import graph the way React does:
 *   - a component's ancestors are the files that import it (plus the
 *     App Router layouts above a page)
 *   - `next/dynamic` imports count too, they are still in the same React tree
 * and asserts every file that renders `m.*` has a provider above it.
 */

// Normalised to forward slashes so it matches the walked file paths.
const SRC = resolve(__dirname, "../..").replace(/\\/g, "/");

/** The test's own source mentions the module names it looks for. */
const isTestFile = (file: string) => file.includes("/src/test/");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((f) => f.replace(/\\/g, "/"));
const fileSet = new Set(files);

/** file -> files it imports (static or dynamic) */
const imports = new Map<string, Set<string>>();

/** file -> files that import it (i.e. its possible React ancestors) */
const importers = new Map<string, string[]>(files.map((f) => [f, []]));

for (const file of files) {
  const src = readFileSync(file, "utf8");
  const deps = new Set<string>();

  // `from "x"` and `import("x")` (next/dynamic) both keep the module in the
  // same React tree, so both count as "rendered inside" the importer.
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const spec = match[1];
    if (!spec.startsWith("@/") && !spec.startsWith(".")) continue;

    let target: string;
    if (spec.startsWith("@/")) {
      target = `${SRC}/${spec.slice(2)}`;
    } else {
      const parts = file.split("/").slice(0, -1);
      for (const part of spec.split("/")) {
        if (part === ".") continue;
        if (part === "..") parts.pop();
        else parts.push(part);
      }
      target = parts.join("/");
    }

    for (const candidate of [
      target,
      `${target}.tsx`,
      `${target}.ts`,
      `${target}/index.tsx`,
      `${target}/index.ts`,
    ]) {
      if (fileSet.has(candidate)) {
        deps.add(candidate);
        break;
      }
    }
  }

  imports.set(file, deps);
  for (const dep of deps) importers.get(dep)?.push(file);
}

// App Router: a page renders inside every layout above it.
for (const file of files) {
  if (!/\/page\.tsx$/.test(file)) continue;
  const parts = file.split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    const layout = `${parts.slice(0, i).join("/")}/layout.tsx`;
    if (fileSet.has(layout)) importers.get(file)?.push(layout);
  }
}

const usesLazyMotion = (file: string) =>
  !isTestFile(file) &&
  /from\s+['"]motion\/react-m['"]/.test(readFileSync(file, "utf8"));

const providesFeatures = (file: string) =>
  /<Motion(?:Provider|LayoutProvider)[\s>]/.test(readFileSync(file, "utf8"));

/** Files that render `m.*` and have no provider above them. */
function findUncovered(): string[] {
  const uncovered: string[] = [];

  for (const file of files) {
    if (!usesLazyMotion(file)) continue;

    const seen = new Set<string>();
    const stack = [file];
    let covered = false;

    while (stack.length) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);

      if (providesFeatures(current)) {
        covered = true;
        break;
      }
      for (const parent of importers.get(current) ?? []) stack.push(parent);
    }

    if (!covered) uncovered.push(file);
  }

  return uncovered;
}

describe("motion provider coverage", () => {
  it("every component rendering m.* has a LazyMotion provider above it", () => {
    const uncovered = findUncovered().map((f) => f.replace(SRC + "/", ""));

    expect(
      uncovered,
      `These files render \`m.*\` but have no MotionProvider above them, so ` +
        `they would silently render unanimated:\n${uncovered.join("\n")}`,
    ).toEqual([]);
  });

  it("still uses the lazy `m` build, not the full `motion` component", () => {
    const fullMotionImports = files.filter(
      (file) =>
        !isTestFile(file) &&
        /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*['"]motion\/react['"]/.test(
          readFileSync(file, "utf8"),
        ),
    );

    expect(
      fullMotionImports.map((f) => f.replace(SRC + "/", "")),
      "Import the `m` build from 'motion/react-m' instead of `motion` from " +
        "'motion/react' - the full build ships the drag/layout features.",
    ).toEqual([]);
  });
});
