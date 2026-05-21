import { defineConfig } from "vite-plus";

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "react",
    },
  },
  pack: {
    dts: { tsgo: true },
    exports: true,
  },
});
