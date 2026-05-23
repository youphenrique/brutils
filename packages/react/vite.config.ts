import { defineConfig } from "vite-plus";
import pluginBabel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "vite-plus/test/browser/providers/playwright";

export default defineConfig({
  pack: {
    dts: true,
    exports: true,
    plugins: [
      pluginBabel({
        presets: [reactCompilerPreset()],
      }),
    ],
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
