import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Underscore-prefixed args (framework-only cache keys) and the omitted
      // rest siblings of `const { id, ...rest } = obj` are intentional.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Vendored animate-ui primitives derive a motion component from a dynamic
    // element type while rendering; that is the library's design and cannot be
    // hoisted to module scope.
    files: ["src/components/animate-ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/static-components": "off",
    },
  },
  {
    // TanStack Table returns functions React Compiler refuses to memoize; the
    // table instance is already owned by a dedicated provider.
    files: ["src/app/**/users-table*.{ts,tsx}"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
