// Gluestack-ui v5 display-component generator.
// Emits bare, style-free wrappers under src/components/ui/<name>/.
// Interactive/form components (button, icon, input, textarea, checkbox, radio,
// switch, form-control) are canonical-grade hand-written files with tva
// variant styles — this script must NOT regenerate them.

import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "src", "components", "ui");

// Creator-driven components (compound sub-parts attached by the factory).
const factoryComponents = [
  { name: "pressable", factory: "createPressable", slots: ["Root"] },
  { name: "divider", factory: "createDivider", slots: ["Root"], importFrom: "@gluestack-ui/core" },
  { name: "spinner", factory: "createSpinner", slots: ["Root"], importFrom: "@gluestack-ui/core" },
  { name: "avatar", factory: "createAvatar", slots: ["Root", "Badge", "Group", "Image", "FallbackText"] },
  { name: "link", factory: "createLink", slots: ["Root", "Text"] },
  { name: "modal", factory: "createModal", slots: ["Root", "Backdrop", "Content", "Header", "Body", "Footer", "CloseButton"] },
  { name: "alert-dialog", factory: "createAlertDialog", slots: ["Root", "Backdrop", "Content", "Header", "Body", "Footer", "CloseButton"] },
];

// Layout/display primitives — thin RN re-exports.
// NativeWind v5 gives core RN primitives className support natively.
const layoutComponents = [
  { name: "box", primitive: "View" },
  { name: "hstack", primitive: "View" },
  { name: "vstack", primitive: "View" },
  { name: "center", primitive: "View" },
  { name: "badge", primitive: "View" },
  { name: "card", primitive: "View" },
  { name: "text", primitive: "Text" },
  { name: "heading", primitive: "Text" },
];

function cap(s) {
  return s.replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

const SLOT_PRIMITIVE = {
  Root: "View",
  Backdrop: "Pressable",
  Content: "View",
  Header: "View",
  Body: "View",
  Footer: "View",
  CloseButton: "Pressable",
  Group: "View",
  Image: "Image",
  FallbackText: "Text",
  Badge: "View",
  Text: "Text",
};

function emitFactory(comp) {
  const Component = cap(comp.name);
  const slots = comp.slots.map((s) => ({ slot: s, prim: SLOT_PRIMITIVE[s] ?? "View" }));
  const prims = [...new Set(slots.map((e) => e.prim))];
  const importSource = comp.importFrom ?? `@gluestack-ui/core/${comp.name}/creator`;

  const slotObj = slots.map((e) => `  ${e.slot}: ${e.prim},`).join("\n");
  const subLocals = slots
    .filter((e) => e.slot !== "Root")
    .map((e) => `const ${Component}${cap(e.slot)} = UI${Component}.${e.slot};`)
    .join("\n");
  const exportList = [
    Component,
    ...slots.filter((e) => e.slot !== "Root").map((e) => `${Component}${cap(e.slot)}`),
  ].join(", ");

  return `import { ${comp.factory} } from "${importSource}";
import { ${prims.join(", ")} } from "react-native";

const UI${Component} = ${comp.factory}({
${slotObj}
});

const ${Component} = UI${Component};
${subLocals}

export { ${exportList} };
`;
}

function emitLayout(comp) {
  return `import { ${comp.primitive} as RN${comp.primitive} } from "react-native";

export const ${cap(comp.name)} = RN${comp.primitive};
`;
}

// Only wipe managed component dirs — keep gluestack-ui-provider.* and the
// hand-written canonical component dirs in outDir untouched.
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const managedNames = [
  ...factoryComponents.map((c) => c.name),
  ...layoutComponents.map((c) => c.name),
];
for (const name of managedNames) {
  const dir = join(outDir, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

let factoryCount = 0;
for (const comp of factoryComponents) {
  const dir = join(outDir, comp.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.tsx"), emitFactory(comp), "utf8");
  factoryCount++;
}

let layoutCount = 0;
for (const comp of layoutComponents) {
  const dir = join(outDir, comp.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.tsx"), emitLayout(comp), "utf8");
  layoutCount++;
}

console.log(`Generated ${factoryCount} factory + ${layoutCount} layout components in ${outDir}`);
