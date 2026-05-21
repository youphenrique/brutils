---
seo:
  title: brutils — The essential Brazilian toolkit for the modern web
  description: Validate, format, generate, and model Brazilian data (CPF, CNPJ,
    CEP, UFs, and more) with a strict, modern, type-safe TypeScript library.
---

::u-page-hero
#title
The essential Brazilian toolkit for the modern web

#description
**brutils** provides functions and UI utilities for Brazilian business rules — data retrieval, modeling, validation, formatting, and generation — built in modern, strict TypeScript.

#links
:::u-button

---

color: neutral
size: xl
to: /en/getting-started/installation
trailing-icon: i-lucide-arrow-right

---

Get started
:::

:::u-button

---

color: neutral
icon: simple-icons-github
size: xl
to: https://github.com/youphenrique/brutils
variant: outline

---

Star on GitHub
:::
::

::u-page-section
#title
What's in the box

#features
:::u-page-feature

---

icon: i-lucide-shield-check

---

#title
[Validation]{.text-primary} that never throws

#description
Public `validate()` functions return result objects with typed error codes instead of throwing — predictable control flow, no surprises.
:::

:::u-page-feature

---

icon: i-lucide-wand

---

#title
[Formatting & masking]{.text-primary}

#description
Apply standard Brazilian masks for CPF, CNPJ, CEP and more — progressive formatting included for live input.
:::

:::u-page-feature

---

icon: i-lucide-dices

---

#title
[Generation]{.text-primary} of valid data

#description
Generate syntactically and arithmetically valid documents — useful for tests, seeds, and demos.
:::

:::u-page-feature

---

icon: i-lucide-map

---

#title
[UFs & regions]{.text-primary}

#description
First-class support for Brazilian states (UFs), regions, and metadata, exposed as a discoverable namespace.
:::

:::u-page-feature

---

icon: i-lucide-package

---

#title
[Tree-shakable]{.text-primary} ESM-first

#description
Each utility (`cpf`, `cnpj`, `cep`, `ufs`) is exported as a namespace from `@brutils/core` — only what you import ships.
:::

:::u-page-feature

---

icon: i-lucide-shapes

---

#title
[Strict TypeScript]{.text-primary}

#description
Built with strict mode, `verbatimModuleSyntax`, and exhaustive typed error codes for every module.
:::
::
