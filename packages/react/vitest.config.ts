import { defineConfig } from "vite-plus/test/config";
import { playwright } from "vite-plus/test/browser/providers/playwright";

export default defineConfig({
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
