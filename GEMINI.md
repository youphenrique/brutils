# GEMINI.md - brutils

## Project Overview

`brutils` is a TypeScript monorepo focused on providing utilities for Brazilian business rules and data validation. The core of the project is the `@brutils/core` package, which currently includes robust support for CPF (Cadastro de Pessoas Físicas) validation, formatting, and generation.

### Key Technologies

- **Monorepo Manager:** [pnpm](https://pnpm.io/)
- **Tooling Engine:** [vite-plus (vp)](https://github.com/voidzero-dev/vite-plus) - Handles building, testing, linting, and formatting.
- **Bundler:** [tsdown](https://github.com/privatenumber/tsdown) (via `vp pack`)
- **Testing:** [vitest](https://vitest.dev/) (via `vp test`)
- **Language:** TypeScript

---

## Project Structure

- `packages/core/`: The main library containing utility functions.
  - `src/cpf.ts`: CPF specific logic (validate, format, generate).
  - `tests/`: Vitest test suites.
- `apps/docs/`: Planned documentation website.
- `tools/`: Internal development tools.

---

## Building and Running

The project uses `vite-plus` (`vp`) as a unified CLI for all development tasks. Commands can be run from the root or within individual packages.

### Root Commands

| Command             | Description                                                 |
| :------------------ | :---------------------------------------------------------- |
| `pnpm run ready`    | Runs format, lint, tests, and builds the entire monorepo.   |
| `pnpm run test`     | Lints and runs tests across all packages.                   |
| `pnpm run build -r` | Builds all packages in the monorepo.                        |
| `pnpm run dev`      | Runs the development server for the website (if available). |
| `vp fmt`            | Formats the codebase.                                       |
| `vp lint`           | Lints the codebase.                                         |

### Package Commands (`packages/core`)

| Command           | Description                        |
| :---------------- | :--------------------------------- |
| `vp pack`         | Builds the package using `tsdown`. |
| `vp pack --watch` | Builds and watches for changes.    |
| `vp test`         | Runs tests for the package.        |
| `tsc --noEmit`    | Performs type checking.            |

---

## Development Conventions

### Coding Style

- **TypeScript First:** All code must be written in TypeScript with strict type checking enabled.
- **Formatting:** Use `vp fmt` to ensure consistent code style.
- **Linting:** Use `vp lint` for static analysis. Type-aware linting is enabled by default.

### Testing Practices

- **Comprehensive Coverage:** New features must include unit tests in the `tests/` directory of the respective package.
- **Test Runner:** Use `vite-plus/test` (Vitest) for writing and running tests.
- **Validation:** Always run `vp test` before committing changes to ensure no regressions.

### Contribution Workflow

1.  **Research:** Identify the utility or fix needed.
2.  **Implementation:** Add logic in the appropriate package (e.g., `packages/core/src`).
3.  **Testing:** Add or update tests in `packages/core/tests`.
4.  **Verification:** Run `pnpm run ready` from the root to ensure everything is correct.
