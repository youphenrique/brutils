# 🇧🇷 BR Utils

A comprehensive TypeScript library for validating, formatting, generating, and manipulating data according to Brazilian business standards and regulations.

[![npm version](https://img.shields.io/npm/v/@brutils/core.svg)](https://www.npmjs.com/package/@brutils/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- 🎯 **Type-safe**: Built with TypeScript, providing full type safety and IntelliSense support
- 📦 **ESM-only**: Modern ECMAScript modules for optimal performance
- 🚀 **Tree-shakeable**: Import only what you need to keep your bundle size minimal
- ✅ **Well-tested**: Comprehensive test coverage for all utilities
- 🎨 **Zero dependencies**: Lightweight with no external dependencies
- 🌐 **Brazilian-focused**: Designed specifically for Brazilian business requirements

## 📦 Installation

```bash
npm install @brutils/core
```

```bash
pnpm add @brutils/core
```

```bash
yarn add @brutils/core
```

> **Note**: This library requires Node.js 24+ and is ESM-only. Make sure your project supports ES modules.

## 🚀 Quick Start

```typescript
import { cpf, cnpj, cep } from "@brutils/core";

// Validate CPF
const result = cpf.safeValidate("56105705735");
console.log(result.success); // true or false

// Format CNPJ
const formatted = cnpj.mask("16370508000111");
console.log(formatted); // "16.370.508/0001-11"

// Generate random CEP
const cep = cep.generate();
console.log(cep); // "06725-063"
```

## 📚 Available Utilities

All utilities follow a consistent API: `[type](value?).[action]()`.

### Types

- `cpf` - CPF (Cadastro de Pessoas Físicas)
- `cnpj` - CNPJ (Cadastro Nacional da Pessoa Jurídica)
- `cep` - CEP (postal code)
- `creditCard` - Credit card numbers
- `phone` - Brazilian phone numbers

### Actions

- `.safeValidate()` - Returns `{ success: boolean, error?: string[] }`
- `.mask()` - Returns formatted string with mask
- `.generate()` - Returns a valid random string
- `.strip()` - Returns only digits

### Specialized formatters

- `currency.format(value: number)` - Format as Brazilian Real (R$)
- `date.format(date: Date | string)` - Format date as DD/MM/YYYY

## 🔧 Usage Examples

### CPF Operations

```typescript
import { cpf } from "@brutils/core";

// Accepts with or without formatting
cpf.safeValidate("123.456.789-09"); // { success: true }
cpf.safeValidate("12345678909"); // { success: true }

// Format CPF
cpf.mask("12345678909"); // "123.456.789-09"

// Clean formatting
cpf.strip("123.456.789-09"); // "12345678909"
```

### CNPJ Operations

```typescript
import { cnpj } from "@brutils/core";

// Validate CNPJ
cnpj.safeValidate("12.345.678/0001-95"); // { success: true }

// Format CNPJ
cnpj.mask("12345678000195"); // "12.345.678/0001-95"

// Generate random valid CNPJ for testing
cnpj.generate(); // "12.345.678/0001-95"
```

### Currency Formatting

```typescript
import { currency } from "@brutils/core";

currency.format(1234.56); // "R$ 1.234,56"
currency.format(1000); // "R$ 1.000,00"
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- 📖 [Documentation](https://brutils.dev)
- 🐛 [Issue Tracker](https://github.com/youphenrique/brutils/issues)
- 💬 [Discussions](https://github.com/youphenrique/brutils/discussions)

---

Made with ❤️ for the Brazilian developer community
