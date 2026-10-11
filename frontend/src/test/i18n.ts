import en from "../../messages/en.json";

/**
 * Test double for `next-intl`.
 *
 * The previous mock returned the last dot-segment of the translation key
 * (`t("list.title")` -> `"title"`), so the DOM rendered raw keys instead of
 * user-facing copy and every assertion on real English text failed.
 *
 * This module resolves keys against the real `messages/en.json` and formats
 * the ICU subset the project actually uses:
 *   - `{name}`                      simple interpolation
 *   - `{n, plural, =0 {..} other {..}}`  with `#` substituted
 *   - `{n, select, a {..} other {..}}`
 *   - `{n, number|date|time, <style>}`
 *
 * No third-party dependency is used so the harness cannot break if pnpm
 * re-prunes the (currently undeclared) transitive `intl-messageformat`.
 */

export const TEST_LOCALE = "en";

type MessageTree = { [key: string]: string | MessageTree };
type Values = Record<string, unknown>;

const MESSAGES = en as unknown as MessageTree;

/** Walks a dotted path through the message tree. */
function lookup(path: string[]): string | undefined {
  let node: string | MessageTree | undefined = MESSAGES;

  for (const segment of path) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[segment];
  }

  return typeof node === "string" ? node : undefined;
}

/** Index of the `}` matching the `{` at `start`, or -1 when unbalanced. */
function findClosing(source: string, start: number): number {
  let depth = 0;

  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/** Parses `=0 {..} one {..} other {..}` into ordered `[selector, message]` pairs. */
function parseSelectors(style: string): Array<[string, string]> {
  const options: Array<[string, string]> = [];
  let i = 0;

  while (i < style.length) {
    while (i < style.length && /\s/.test(style[i])) i++;

    const keyStart = i;
    while (i < style.length && style[i] !== "{" && style[i] !== ",") i++;
    const key = style.slice(keyStart, i).trim();

    while (i < style.length && /\s/.test(style[i])) i++;
    if (i >= style.length || style[i] !== "{") break;

    const end = findClosing(style, i);
    if (end === -1) break;

    options.push([key, style.slice(i + 1, end)]);
    i = end + 1;
  }

  return options;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function formatTyped(value: unknown, type: string, style: string, locale: string): string {
  const options: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions | undefined = style
    ? { style: style as Intl.NumberFormatOptions['style'] }
    : undefined;

  try {
    if (type === "number") return new Intl.NumberFormat(locale, options).format(value as number);
    if (type === "date") return new Intl.DateTimeFormat(locale, options).format(value as Date);
    if (type === "time") return new Intl.DateTimeFormat(locale, options).format(value as Date);
  } catch {
    // Fall through to the raw value for styles the runtime does not accept.
  }

  return stringify(value);
}

function resolveArgument(
  body: string,
  values: Values,
  locale: string,
  parentPlural: number | null
): string {
  const firstComma = body.indexOf(",");

  // Simple `{name}` — no type, no style.
  if (firstComma === -1) return stringify(values[body.trim()]);

  const name = body.slice(0, firstComma).trim();
  const rest = body.slice(firstComma + 1);
  const secondComma = rest.indexOf(",");
  const type = (secondComma === -1 ? rest : rest.slice(0, secondComma)).trim();
  const style = (secondComma === -1 ? "" : rest.slice(secondComma + 1)).trim();
  const value = values[name];
  const options = parseSelectors(style);

  if (type === "plural" || type === "selectordinal") {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    let category = "other";
    try {
      category = new Intl.PluralRules(locale, { type: type as Intl.PluralRuleType }).select(safe);
    } catch {
      category = safe === 1 ? "one" : "other";
    }

    const match =
      options.find(([key]) => key === `=${safe}`) ??
      options.find(([key]) => key === category) ??
      options.find(([key]) => key === "other");

    return match ? parse(match[1], values, locale, safe) : "";
  }

  if (type === "select") {
    const match =
      options.find(([key]) => key === stringify(value)) ??
      options.find(([key]) => key === "other");

    return match ? parse(match[1], values, locale, parentPlural) : "";
  }

  if (type === "number" || type === "date" || type === "time") {
    return formatTyped(value, type, style, locale);
  }

  return stringify(value);
}

function parse(
  source: string,
  values: Values,
  locale: string,
  pluralValue: number | null
): string {
  let out = "";
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (char === "{") {
      const end = findClosing(source, i);
      if (end === -1) {
        out += source.slice(i);
        break;
      }
      out += resolveArgument(source.slice(i + 1, end), values, locale, pluralValue);
      i = end + 1;
      continue;
    }

    if (char === "#" && pluralValue !== null) {
      out += new Intl.NumberFormat(locale).format(pluralValue);
      i += 1;
      continue;
    }

    out += char;
    i += 1;
  }

  return out;
}

/** Applies ICU formatting to a raw message template. */
export function formatMessage(template: string, values?: Values, locale = TEST_LOCALE): string {
  return parse(template, values ?? {}, locale, null);
}

export type TestTranslator = {
  (key: string, values?: Values): string;
  raw: (key: string) => string;
  rich: (key: string, values?: Values) => string[];
};

/**
 * Builds a translator scoped to `namespace`, mirroring
 * `useTranslations(namespace)` from next-intl. Missing keys resolve to their
 * full dotted path so failures stay readable instead of throwing.
 */
export function createTestTranslator(namespace?: string | string[]): TestTranslator {
  const prefix =
    namespace === undefined ? [] : Array.isArray(namespace) ? namespace : [namespace];

  const resolveKey = (key: string): string => [...prefix, ...key.split(".")].join(".");

  const t = ((key: string, values?: Values): string => {
    const fullPath = resolveKey(key);
    const template = lookup(fullPath.split("."));

    return template === undefined ? fullPath : formatMessage(template, values);
  }) as TestTranslator;

  t.raw = (key: string): string => lookup(resolveKey(key).split(".")) ?? resolveKey(key);
  t.rich = (key: string, values?: Values): string[] => [t(key, values)];

  return t;
}

/** Translator for the message tree, mirroring `createTranslator`. */
export const testTranslator: TestTranslator = createTestTranslator();

export { en as testMessages };
