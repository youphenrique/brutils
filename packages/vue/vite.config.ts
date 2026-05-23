import { defineConfig } from "vite-plus";
import Vue from "unplugin-vue/rolldown";
import vue from "@vitejs/plugin-vue";
import { playwright } from "vite-plus/test/browser/providers/playwright";

export default defineConfig({
  plugins: [vue()],
  pack: {
    plugins: [Vue()],
    dts: { vue: true },
    exports: true,
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
