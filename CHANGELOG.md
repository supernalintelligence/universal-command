# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-19

### Added

- Repotype checks the repository layout (`repotype.yaml`, `pnpm run repo:lint`, and a CI step), so stray root files, committed build output and missing release documents fail the build.

### Changed

- Removed the unused `zod` ^3 dependency. No source file imports it, and the MCP packages bring their own `zod` 4.
- Lint runs on the TypeScript sources again: ESLint 9 flat config with the typescript-eslint parser (new dev dependencies).
- Breaking: the MCP adapter moved from `@modelcontextprotocol/sdk` (1.x) to `@modelcontextprotocol/server` and `@modelcontextprotocol/node` (2.x), now regular dependencies of this package, so a consumer needs no extra install. Requires Node 20 or newer and the 2.x packages' own `zod` 4.2 dependency. Version 0.2.0.
- `createMCPHttpApp` takes `protocolEra`. The default, `'legacy'`, answers 2025-era traffic in JSON exactly as before. `'both'` also serves the 2026-07-28 era and answers 2025-era requests as an event stream.
- In `'both'` mode the caller identity builder refuses a request object that carries no headers (a defensive check: the SDK always passes a real request, so this does not occur through `toNodeHandler`).
- `'both'` mode refuses `subscriptions/listen` (`maxSubscriptions: 0`), since this server publishes no change events, and `createMCPHttpApp` now also returns `close()`, which aborts open 2026-07-28 exchanges. `start()` calls it when its server closes.
- `runtime` `startMCP` and the generated MCP server template use the 2.x packages. `startMCP` loads the SDK with dynamic `import()`, so it works in the ESM build.
- Behavior change (tenancy): `resolveContextCompanyLock` no longer lets an `X-Supernal-Company-Slug` header supply the company for an HTTP caller with no valid session id. Under the default `'refuse'` policy that caller is refused; under `'platform'` the header still narrows it to that company. The header only agrees with a session or environment lock, or narrows a platform record. This also applies to a session header that is missing, malformed or duplicated (`"a, b"`).

### Fixed

- `toNextAPI()` no longer returns HTTP 500 for every successful response when the package is loaded as ESM. `next/server` is now resolved at request time without a bare `require()`.
- Behavior change: when `next` cannot be loaded, a successful `toNextAPI()` call now returns a plain `Response` with status 200 and the JSON body instead of the old 500 "next package is required" error. The error-path fallback body now includes `details`.
- `next/server` is resolved from the package's own install location (not the caller's), once per process, and loaded before auth on every `toNextAPI()` request. In runtimes without `require` and without a resolvable `next` (for example the edge runtime) responses are plain `Response` objects.

## [0.1.0] - 2025-01-31

### Added

- Initial release of `@supernal/universal-command`
- **Core Features**
  - `UniversalCommand` class for defining commands once
  - `CommandRegistry` for managing multiple commands
  - Input/output schema definition with validation
  - Execution context with interface-specific information

- **Interface Generators**
  - CLI generation via Commander.js (`toCLI()`)
  - Next.js API route generation (`toNextAPI()`)
  - Express route generation (`toExpressAPI()`)
  - MCP tool generation (`toMCP()`)

- **Code Generation**
  - Build-time route generation for Next.js
  - TypeScript support with full type inference

- **Runtime Server**
  - `RuntimeServer` for zero-config deployment
  - Support for Next.js, Express, and MCP transports
  - Dynamic command registration

- **Scope Management**
  - `ScopeRegistry` for hierarchical command organization
  - Scope-based filtering and discovery

- **Testing Utilities**
  - `testCLI()`, `testAPI()`, `testMCP()` helpers
  - Mock execution context for unit testing

- **Developer Experience**
  - Full TypeScript support
  - Comprehensive documentation
  - 93 tests with full coverage

### Dependencies

- `ajv` ^8.12.0 - JSON Schema validation
- `fs-extra` ^11.2.0 - File system utilities
- `zod` ^3.22.4 - TypeScript-first schema validation

### Peer Dependencies (optional)

- `commander` ^12.0.0 - For CLI generation
- `next` ^14.0.0 || ^15.0.0 - For Next.js API generation
- `express` ^4.0.0 || ^5.0.0 - For Express API generation
- `@modelcontextprotocol/sdk` ^1.25.2 - For MCP generation

[Unreleased]: https://github.com/supernalintelligence/universal-command/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/supernalintelligence/universal-command/releases/tag/v0.1.0
