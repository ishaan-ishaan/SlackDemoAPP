# Hybrid TypeScript + Google Apps Script Architecture

This project is a **hybrid TypeScript + Google Apps Script (GAS)** setup with:

- **TypeScript** as the single source of truth
- **esbuild** bundling into a single `build/Code.js` for GAS
- **Node.js** for local development and tests (Vitest)
- **OOP-style clients** for external systems (Notion, Sheets, etc.)
- **Pure functions** in `src/core` that can run in both GAS and Node

This README documents the **tools** and **structure** for the codebase.

---

## 1. Tools & Config Files

### 1.1 Core tooling

- **TypeScript** – language + type system
- **esbuild** – bundler to produce GAS-compatible `Code.js`
- **Vitest** – test runner (Node environment)
- **Node.js** – local runtime for dev/tests
- **dotenv** – load environment variables from `.env` for Node-only code

### 1.2 Important config files

At repo root:

```txt
project-root/
  README.md
  package.json

  tsconfig.json
  tsconfig.node.json
  esbuild.config.ts
  vitest.config.ts
  .env

  src/
    core/        # Pure logic (no GAS, no Node globals)
    clients/     # OOP-style clients for external systems
    gas/         # GAS-specific helpers (SpreadsheetApp, UrlFetchApp, etc.)
    jobs/        # Workflows/orchestrators
    node/        # Node-specific utilities (optional)
    gas.entry.ts # GAS entrypoint (bundled → build/Code.js)
    node.entry.ts # Node entrypoint for local dev (optional)

  tests/
    core/        # Unit tests for src/core (pure logic)
    clients/     # Tests with mocks for clients
    jobs/        # Tests for workflow logic (with mocked clients)
# Automaton
