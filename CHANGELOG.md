# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
