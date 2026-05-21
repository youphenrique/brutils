---
seo:
  title: brutils — O kit essencial brasileiro para a web moderna
  description: Valide, formate, gere e modele dados brasileiros (CPF, CNPJ, CEP,
    UFs e mais) com uma biblioteca TypeScript moderna, estrita e tipada.
---

::u-page-hero
#title
O kit essencial brasileiro para a web moderna

#description
**brutils** fornece funções e utilitários de UI para regras de negócio brasileiras — consulta, modelagem, validação, formatação e geração de dados — em TypeScript moderno e estrito.

#links
:::u-button

---

color: neutral
size: xl
to: /pt-BR/getting-started/installation
trailing-icon: i-lucide-arrow-right

---

Começar
:::

:::u-button

---

color: neutral
icon: simple-icons-github
size: xl
to: https://github.com/youphenrique/brutils
variant: outline

---

Star no GitHub
:::
::

::u-page-section
#title
O que tem na caixa

#features
:::u-page-feature

---

icon: i-lucide-shield-check

---

#title
[Validação]{.text-primary} que nunca lança exceções

#description
Funções `validate()` públicas retornam objetos de resultado com códigos de erro tipados em vez de lançar exceções — controle de fluxo previsível, sem surpresas.
:::

:::u-page-feature

---

icon: i-lucide-wand

---

#title
[Formatação e máscaras]{.text-primary}

#description
Aplique máscaras brasileiras padrão para CPF, CNPJ, CEP e mais — com formatação progressiva incluída para entrada ao vivo.
:::

:::u-page-feature

---

icon: i-lucide-dices

---

#title
[Geração]{.text-primary} de dados válidos

#description
Gere documentos sintática e aritmeticamente válidos — útil para testes, seeds e demos.
:::

:::u-page-feature

---

icon: i-lucide-map

---

#title
[UFs e regiões]{.text-primary}

#description
Suporte de primeira classe a estados (UFs), regiões e metadados, expostos como um namespace descobrível.
:::

:::u-page-feature

---

icon: i-lucide-package

---

#title
[Tree-shakable]{.text-primary}, ESM-first

#description
Cada utilitário (`cpf`, `cnpj`, `cep`, `ufs`) é exportado como namespace de `@brutils/core` — apenas o que você importa vai para o bundle.
:::

:::u-page-feature

---

icon: i-lucide-shapes

---

#title
[TypeScript estrito]{.text-primary}

#description
Construído com strict mode, `verbatimModuleSyntax` e códigos de erro tipados exaustivamente para cada módulo.
:::
::
