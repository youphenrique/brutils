# brutils - The essential Brazilian toolkit for the modern web

## Project Overview

`brutils` is a TypeScript monorepo focused on providing utilities for Brazilian business rules and data modeling, validation, formatting, generation. The core of the project is the `@brutils/core` package.

### Key Technologies

- **Monorepo Manager:** [pnpm](https://pnpm.io/)
- **Tooling Engine:** [vite-plus (vp)](https://github.com/voidzero-dev/vite-plus) - Handles building, testing, linting, and formatting.
- **Bundler:** [tsdown](https://github.com/privatenumber/tsdown) (via `vp pack`)
- **Testing:** [vitest](https://vitest.dev/) (via `vp test`)
- **Language:** TypeScript

---

## Project Structure

- `packages/core/`: The main library containing utility functions.
  - `src/`: Modules specific logic (validate, format, generate, etc.).
  - `tests/`: Vitest test suites.
- `apps/docs/`: Planned documentation website.

---

## Building and Running

The project uses `vite-plus` (`vp`) as a unified CLI for all development tasks built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`. Commands can be run from the root or within individual packages.

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

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->

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
