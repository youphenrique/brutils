import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    // Workspace consumers resolve source; `publishConfig` points published exports at `dist`.
    exports: { devExports: true },
    // Fail the build on any warning, including publint warnings, so packaging regressions can't slip through.
    failOnWarn: true,
    // Emitted on every build while TypeScript 7's API is experimental; not actionable here.
    suppressWarnings: ["TypeScript 7.0 does not yet have a stable API"],
    // publint and attw run against a single tarball packed with the workspace's package manager.
    publint: true,
    attw: {
      profile: "strict",
      level: "error",
      // Intentionally ESM-only: CJS consumers always resolve to ESM.
      ignoreRules: ["cjs-resolves-to-esm"],
    },
  },
  test: {
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
