import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { translationSchema } from "../src/i18n/translations-schema";

const messagesDir = join(process.cwd(), "messages");

if (!existsSync(messagesDir)) {
  console.error(`❌ messages directory not found: ${messagesDir}`);
  process.exit(1);
}

const translationFiles = readdirSync(messagesDir)
  .filter((f) => /^[a-z]{2}\.json$/.test(f))
  .sort();

if (translationFiles.length === 0) {
  console.error(`❌ No translation files found in ${messagesDir}`);
  process.exit(1);
}

type FlatMap = Map<string, string>;

function flatten(obj: unknown, prefix = "", out: FlatMap = new Map()): FlatMap {
  if (obj === null || obj === undefined) return out;
  if (typeof obj === "string") {
    out.set(prefix, obj);
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : `${i}`, out));
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      flatten(v, next, out);
    }
    return out;
  }
  return out;
}

function extractPlaceholders(str: string): Set<string> {
  const re = /\{(\w+)(?:\s*,|\s*\})/g;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(str))) out.add(m[1].trim());
  return out;
}

const loaded = new Map<string, { raw: unknown; flat: FlatMap }>();
let hasError = false;

for (const file of translationFiles) {
  const filePath = join(messagesDir, file);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (e) {
    console.error(`❌ ${file}: invalid JSON — ${(e as Error).message}`);
    hasError = true;
    continue;
  }

  const result = translationSchema.safeParse(raw);
  if (!result.success) {
    console.error(`❌ Schema validation failed for ${file}:`);
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
    }
    hasError = true;
  } else {
    console.log(`✅ ${file} — schema valid`);
  }

  const flat = flatten(raw);
  loaded.set(file, { raw, flat });

  for (const [k, v] of flat) {
    if (typeof v === "string" && v.trim() === "") {
      console.error(`❌ ${file}: empty string at ${k}`);
      hasError = true;
    }
  }
}

if (loaded.size >= 2) {
  const baseFile = translationFiles.includes("en.json") ? "en.json" : translationFiles[0];
  const base = loaded.get(baseFile);
  if (base) {
    const baseKeys = new Set(base.flat.keys());
    for (const file of translationFiles) {
      if (file === baseFile) continue;
      const cur = loaded.get(file);
      if (!cur) continue;

      const curKeys = new Set(cur.flat.keys());
      const missing = [...baseKeys].filter((k) => !curKeys.has(k));
      const extra = [...curKeys].filter((k) => !baseKeys.has(k));

      if (missing.length > 0) {
        console.error(`\n❌ ${file} is missing ${missing.length} key(s) present in ${baseFile}:`);
        missing.slice(0, 50).forEach((k) => console.error(`   - ${k}`));
        if (missing.length > 50) console.error(`   ... and ${missing.length - 50} more`);
        hasError = true;
      }
      if (extra.length > 0) {
        console.warn(`\n⚠️  ${file} has ${extra.length} extra key(s) not in ${baseFile}:`);
        extra.slice(0, 30).forEach((k) => console.warn(`   + ${k}`));
        if (extra.length > 30) console.warn(`   ... and ${extra.length - 30} more`);
      }

      for (const key of baseKeys) {
        if (!cur.flat.has(key)) continue;
        const baseVal = base.flat.get(key) as string;
        const curVal = cur.flat.get(key) as string;
        if (typeof baseVal !== "string" || typeof curVal !== "string") continue;
        const basePH = extractPlaceholders(baseVal);
        const curPH = extractPlaceholders(curVal);
        const missingPH = [...basePH].filter((p) => !curPH.has(p));
        const extraPH = [...curPH].filter((p) => !basePH.has(p));
        if (missingPH.length > 0 || extraPH.length > 0) {
          console.error(
            `❌ Placeholder mismatch at ${key} (${baseFile} → ${file}): base {${[...basePH].join(", ")}} vs ${file} {${[...curPH].join(", ")}}`,
          );
          hasError = true;
        }
      }

      if (missing.length === 0 && extra.length === 0) {
        const phOk = [...baseKeys].every((k) => {
          const bv = base.flat.get(k) as string;
          const cv = cur.flat.get(k) as string;
          if (typeof bv !== "string" || typeof cv !== "string") return true;
          const bp = extractPlaceholders(bv);
          const cp = extractPlaceholders(cv);
          return bp.size === cp.size && [...bp].every((p) => cp.has(p));
        });
        if (phOk) console.log(`✅ ${file} — key parity with ${baseFile} (${baseKeys.size} keys)`);
      }
    }
  }
}

if (hasError) {
  console.error("\n❌ Translation validation failed");
  process.exit(1);
} else {
  console.log(`\n✅ All ${translationFiles.length} translation file(s) passed`);
}
