# Universal Command - Define Once, Deploy Everywhere

> **Growth Gate:** Does this compound self-sustaining growth? If not, stop. See root CLAUDE.md.

Core abstraction for the Supernal platform. Define a command once and auto-generate CLI (Commander.js), Next.js API routes, and MCP tool interfaces from a single schema. v0.1.0, MIT, open source.

## Tech Stack

- TypeScript (ESM, `"type": "module"`, dual CJS/ESM output)
- Build: tsup (multiple entry points)
- Test: Vitest
- Runtime: Node.js >= 18
- Peer deps (all optional): commander, express, next, @modelcontextprotocol/sdk
- Dependencies: ajv, zod, fs-extra

## Build & Test

```bash
pnpm run build       # tsup (builds 7 entry points: index, codegen, generators, mcp, testing, runtime, scopes)
pnpm test            # vitest (watch mode)
pnpm run test:ci     # vitest run
pnpm run type-check  # tsc --noEmit
pnpm run lint        # eslint src
```

## Repo Structure

```
src/
  UniversalCommand.ts   # Core class - schema validation, toCLI(), toNextAPI(), toMCP()
  types.ts              # All type definitions (CommandSchema, Parameter, ExecutionContext, etc.)
  errors.ts             # ValidationError and typed error classes
  CommandRegistry.ts    # Registry for managing multiple commands (lookup by name, MCP name, API path)
  CLIProgram.ts         # CLI program wrapper with global options and lifecycle hooks
  LazyUniversalCommand.ts  # Lazy-loaded command variant
  HelpGenerator.ts      # Help text generation
  formatting.ts         # Output formatting utilities
  codegen/
    index.ts            # Code generation: generateNextRoutes(), generateCLIProgram(), generateMCPServer()
  generators/           # Plugin-based generator system (NextRoutesGenerator, MCPServerGenerator)
  mcp/
    index.ts            # createMCPServer() from CommandRegistry
  testing/
    index.ts            # testCLI(), testAPI(), testMCP() - test helpers with output capture
  runtime/
    index.ts            # Runtime utilities
  scopes/
    index.ts            # Semantic scope system for command grouping and progressive loading
  commands/             # Built-in commands (planning, workflow, agent, test)
```

## How to Define a Command

```typescript
import { UniversalCommand } from '@supernal/universal-command';

const myCommand = new UniversalCommand({
  name: 'thing do', // Space-separated = subcommand tree (sc thing do)
  description: 'Does the thing',
  scope: 'project', // Semantic scope for grouping
  keywords: ['thing'], // For MCP/search discovery
  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, positional: true },
      { name: 'format', type: 'string', enum: ['json', 'text'], default: 'json' },
    ],
  },
  output: { type: 'json' }, // 'json' | 'text' | 'stream'
  handler: async (args, context) => {
    // context.interface is 'cli' | 'api' | 'mcp' | 'test'
    return { result: args.id };
  },
  cli: { aliases: ['td'], streaming: false },
  api: { method: 'GET', cacheControl: { maxAge: 60 } },
  mcp: { toolName: 'custom_tool_name' },
});
```

## Surfaces

Every `UniversalCommand` emits four surfaces from one definition:

| Method        | Surface                | Consumer                            |
| ------------- | ---------------------- | ----------------------------------- |
| `toCLI()`     | Commander.js command   | `sc <name>` in terminal             |
| `toNextAPI()` | Next.js route handlers | HTTP / fetch()                      |
| `toMCP()`     | MCP tool definition    | AI agents via MCP                   |
| `toTool()`    | `{ config, handler }`  | UI ToolRegistry via `fromCommand()` |

`toTool()` maps the schema to a `@supernal/interface`-compatible config and wraps `execute()` with `interface: 'api'`. Use `fromCommand(myCommand)` in supernal-interface code to register it. No transport added — direct function call. Full spec: `.supernal/docs/specs/platform/universal-tool-bridge.md`

## Key Interfaces

- `CommandSchema<TInput, TOutput>`: Full command definition (name, description, input, output, handler, cli/api/mcp options)
- `Parameter`: Input parameter (name, type, required, default, enum, min/max, pattern, positional, variadic)
- `ExecutionContext`: Runtime context (interface type, request, stdout/stderr, stdin, isTTY, prompt, passThroughOptions)
- `UniversalCommand.toCLI()`: Returns Commander.js Command with positional args, options, subcommand trees
- `UniversalCommand.toNextAPI()`: Returns `{ GET/POST/PUT/DELETE/PATCH: handler }` for Next.js App Router
- `UniversalCommand.toMCP()`: Returns MCP tool definition with JSON Schema input
- `CommandRegistry`: Map-based registry with lookup by name, MCP tool name, or API path
- `CLIProgram`: Wraps Commander with global options (--verbose, --config) and lifecycle hooks (beforeCommand, afterCommand, onError)

## Code Conventions

- Command names use space separation for subcommand hierarchy: `'repotype validate'` becomes `sc repotype validate`
- Peer dependencies are lazy-loaded with try/catch -- the package works without commander/next/MCP SDK installed
- Parameter `positional: true` makes it a CLI positional arg instead of `--flag`
- Parameter `variadic: true` + `positional: true` enables `<files...>` syntax
- Commander converts kebab-case options to camelCase; `validateArgs` checks both forms
- MCP tool names default to `sc_` prefix with underscores: `'repotype validate'` -> `sc_repotype_validate`
- Tests co-located with source files (`.test.ts` next to implementation)
- lint-staged runs prettier + eslint on commit

## Important Rules

- ALL new commands in the Supernal ecosystem MUST use UniversalCommand -- never raw Commander.js/Express/MCP
- The handler function must work identically across all interfaces (CLI, API, MCP, test)
- Do NOT import commander/next/@modelcontextprotocol at top level -- always lazy-load in methods
- The `execute()` method validates args before calling handler -- do not skip validation
- When adding a new entry point, update both `tsup.config.ts` (entry) and `package.json` (exports)
- `generateNextRoutes` and `generateMCPServer` in codegen are deprecated -- use the generators module directly

---

## Meta-Repo Context

This package is a **git submodule** within the [supernal-coding](https://github.com/supernalintelligence/supernal-coding) monorepo. When working here, the parent repo's CLAUDE.md is NOT auto-loaded — you are in an isolated git root.

**Cross-cutting tools available from the parent repo:**

- `sc task create/list/done` — task management (tracks work across all packages)
- `sc test` — test runner with requirement evidence logging
- `si test` — interface testing, contract scanning
- `@supernal/universal-command` — all new commands must use this pattern
- `repotype validate` — repo structure validation

**Parent docs:** See the root [CLAUDE.md](../../CLAUDE.md) and [/supernal/CLAUDE.md](../../../CLAUDE.md) for monorepo-wide conventions and the full sub-repo map.
