import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow underscore-prefixed identifiers to be unused (standard TS convention)
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // fumadocs-mdx generated files — not hand-authored
    ".source/**",
    // Standalone Node.js CJS utility scripts — not app code, use require() intentionally
    "scripts/**",
    // SDK sample files — illustrative code, not production Next.js
    "kakunin-samples/**",
    // SDK dist output + vendored deps — compiled, not hand-authored
    "sdk/**/dist/**",
    "sdk/**/node_modules/**",
    // Vitest coverage report output
    "coverage/**",
  ]),
]);

export default eslintConfig;
