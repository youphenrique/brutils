import { defineConfig } from "vite-plus/test/config";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
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
