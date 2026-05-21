# @brutils/docs

The documentation site for [`brutils`](../README.md) — the essential Brazilian toolkit for the modern web.

Built with [Docus](https://docus.dev) on top of [Nuxt 4](https://nuxt.com) and [Nuxt Content](https://content.nuxt.com/), with internationalization (English + Português Brasileiro).

## Develop

From the repo root:

```bash
pnpm install
pnpm dev
```

That runs the `dev` script of `@brutils/docs` and serves the site at <http://localhost:3000>.

You can also run it directly from this folder:

```bash
pnpm --filter @brutils/docs dev
```

## Build

```bash
pnpm --filter @brutils/docs build
```

The output goes to `docs/.output/` and can be deployed to any Node.js host.

## Project layout

```
docs/
├── content/
│   ├── en/                  # English content
│   │   ├── index.md         # Landing page (/en)
│   │   ├── 1.getting-started/
│   │   └── 2.essentials/
│   └── pt-BR/               # Brazilian Portuguese content
├── public/                  # Static assets (favicon, images)
├── nuxt.config.ts           # Nuxt + i18n config (locales: en, pt-BR)
├── tsconfig.json
└── package.json             # @brutils/docs
```

URL structure with i18n:

- English: `/en/getting-started/installation`
- Português: `/pt-BR/getting-started/installation`

## Writing content

Pages are Markdown with [MDC syntax](https://content.nuxt.com/docs/files/markdown#mdc-syntax) for embedding Vue components from [Nuxt UI](https://ui.nuxt.com) and the Docus theme. The `1.`/`2.` prefix on folder names controls navigation ordering.

For an overview of the available MDC components used by the theme, see the `essentials/` section of the live site.
