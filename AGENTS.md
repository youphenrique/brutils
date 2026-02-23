# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

BR Utils is a TypeScript monorepo providing Brazilian business utilities (validation, formatting, generation) published as `@brutils/core`. The codebase is ESM-only and targets modern Node.js runtimes.

## Codebase Structure

```
.
├── packages/
│   └── core/            # @brutils/core library
│       ├── src/         # Source code
│       ├── tests/       # Vitest tests
│       └── dist/        # Build output (generated)
├── apps/                # App shells
├── package.json         # Workspace scripts and tooling
└── pnpm-workspace.yaml  # Workspace definition
```

Key files:
- `packages/core/src/index.ts` - library entry point
- `packages/core/tests/index.test.ts` - test suite entry point
- `packages/core/tsdown.config.ts` - build configuration

## Development Workflow

### Requirements

- Node.js v24+
- pnpm v10.27.0 (see `package.json` `packageManager`)
- ES modules only (`"type": "module"`)

### Workspace Commands (root)

- `pnpm test` - Run all tests (Vitest)
- `pnpm format` - Run formatting across packages (Turbo)
- `pnpm format:fix` - Apply formatting with Oxfmt
- `pnpm lint` - Run Oxlint
- `pnpm lint:fix` - Auto-fix lint issues

### Package Commands (`packages/core`)

- `pnpm --filter @brutils/core build` - Build with tsdown
- `pnpm --filter @brutils/core dev` - Watch mode build
- `pnpm --filter @brutils/core test` - Run package tests
- `pnpm --filter @brutils/core typecheck` - TypeScript type check

## Testing Rules

- All new functionality must include tests in `packages/core/tests`.
- Tests must be written in TypeScript.
- Cover both success and failure cases, including edge cases.
- Do not use `console.log` or `debugger` in tests or production code.

## Contribution Rules

- Ask before generating new files.
- Follow existing patterns in `packages/core/src`.
- Keep changes minimal and focused.
- Update documentation if public APIs change.

## Git and PRs

- Base work on `main`.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.
- Keep commits focused and atomic.
- Use the `gh` CLI for GitHub data (issues/PRs) when needed.
