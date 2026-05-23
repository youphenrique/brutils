import { defineConfig } from "vite-plus";
import pluginBabel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";

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
});
