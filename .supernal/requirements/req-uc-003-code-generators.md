---
id: REQ-UC-003
title: Code Generators for CLI, API, MCP, OpenAPI
status: Done
priority: High
category: generators
upstream_ref: https://github.com/supernalintelligence/supernal-coding/blob/main/docs/architecture/decisions/2026-01-09-unified-cli-api-mcp-abstraction.md
tests:
  - src/generators/index.test.ts
created: '2026-01-09'
updated: '2026-01-11'
---

# REQ-UC-003: Code Generators

## Summary

Transform UniversalCommand definitions into target-specific code for CLI (Commander.js), API routes (Next.js), MCP tools, and OpenAPI specifications.

## Requirements

```gherkin
Feature: CLI Code Generation
  As a developer
  I want to generate Commander.js CLI commands
  So that my commands work in the terminal

  Scenario: Generate CLI command from UniversalCommand
    Given a UniversalCommand with parameters
    When generateCLI() is called
    Then a Commander.js command should be generated
    And all parameters become CLI options
    And required params become required options

  Scenario: Include help text
    Given a command with descriptions
    When CLI is generated
    Then --help shows parameter descriptions

Feature: Next.js API Route Generation
  As a developer
  I want to generate Next.js API routes
  So that my commands are accessible via HTTP

  Scenario: Generate API route
    Given a UniversalCommand
    When generateNextRoutes() is called
    Then a route.ts file should be generated
    And GET/POST handlers should be created
    And input validation should be included

  Scenario: Handle query parameters
    Given a command with string/number params
    When API route is called with query params
    Then params should be extracted and typed

Feature: MCP Tool Generation
  As a developer
  I want to generate MCP tool definitions
  So that AI assistants can use my commands

  Scenario: Generate MCP tool
    Given a UniversalCommand
    When generateMCPServer() is called
    Then MCP tool definition should be generated
    And inputSchema should match command params
    And tool should be callable via MCP protocol

Feature: OpenAPI Specification Generation
  As a developer
  I want to generate OpenAPI specs
  So that I have API documentation

  Scenario: Generate OpenAPI spec
    Given a CommandRegistry with commands
    When generateOpenAPI() is called
    Then OpenAPI 3.0 spec should be generated
    And all commands become paths
    And parameters become query/body params
```

## Implementation

See: `src/generators/`

- `plugins/mcp-server.ts` - MCP generation
- `plugins/next-routes.ts` - Next.js routes
- `plugins/openapi.ts` - OpenAPI specs

## Test Coverage

- `src/generators/index.test.ts` - 18 tests
