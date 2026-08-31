import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  extends: ["docus"],
  modules: ["@nuxtjs/i18n"],
  i18n: {
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        name: "English",
      },
      {
        code: "pt-BR",
        name: "Português (Brasil)",
      },
    ],
  },
} as any);
