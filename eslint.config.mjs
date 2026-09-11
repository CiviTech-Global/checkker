// Root flat config: composes the per-package configs so repo-root
// invocations (lint-staged pre-commit hook, editors, CI) resolve correctly.
// Each package remains the source of truth for its own rules.
import js from "@eslint/js";
import serverConfig from "./apps/server/eslint.config.mjs";
import mobileConfig from "./apps/mobile/eslint.config.mjs";
import desktopConfig from "./apps/desktop/eslint.config.mjs";

/**
 * Re-scope an imported package config to root-relative paths.
 * Flat-config `files`/`ignores` patterns resolve from the loading
 * config's directory, so `src/**` must become `<base>/src/**`.
 * The shared `js.configs.recommended` block (same module instance in
 * every package config) is dropped here — the root includes it once.
 */
function scope(base, config) {
  return config.flatMap((block) => {
    if (block === js.configs.recommended) return [];
    if (!block.files) return [];
    const { ignores, ...rest } = block;
    const scoped = { ...rest, files: block.files.map((p) => `${base}/${p}`) };
    if (ignores) {
      scoped.ignores = ignores.map((p) =>
        p.startsWith("**/") || p.startsWith("/") ? p : `${base}/${p}`,
      );
    }
    return [scoped];
  });
}

export default [
  js.configs.recommended,
  ...scope("apps/server", serverConfig),
  ...scope("apps/mobile", mobileConfig),
  ...scope("apps/desktop", desktopConfig),
  // Shared packages have no per-package config; lint them with the same
  // Node TypeScript rules as the server (found by matching its `files` block).
  {
    ...serverConfig.find((block) => block.files),
    files: ["packages/**/*.ts"],
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.expo/**",
      "**/.turbo/**",
      "checkker_mobile/**",
      "e2e/**",
      "graphify-out/**",
      "*.log",
      "junit.xml",
    ],
  },
];
