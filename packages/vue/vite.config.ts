import { defineConfig } from "vite-plus";
import Vue from "unplugin-vue/rolldown";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  pack: {
    plugins: [Vue()],
    dts: { vue: true },
    exports: true,
  },
});
