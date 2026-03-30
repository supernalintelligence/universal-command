---
id: REQ-UC-001
title: Universal Command Core Abstraction
status: Done
priority: Critical
category: core
upstream_ref: https://github.com/supernalintelligence/supernal-coding/blob/main/docs/architecture/decisions/2026-01-09-unified-cli-api-mcp-abstraction.md
tests:
  - src/UniversalCommand.test.ts
created: '2026-01-09'
updated: '2026-01-11'
---

# REQ-UC-001: Universal Command Core Abstraction

## Summary

Define a command once and deploy to CLI, API, and MCP automatically. Eliminates triple maintenance burden.

## Background

Current approach requires maintaining three parallel implementations:

- CLI Command (Commander.js)
- API Endpoint (Next.js routes)
- MCP Tool (Model Context Protocol)

This creates drift risk, duplicated logic, and 3x development effort.

## Requirements

### Functional Requirements

```gherkin
Feature: Universal Command Definition
  As a developer
  I want to define commands once
  So that I can deploy to CLI, API, and MCP without duplication

  Scenario: Define a command with typed parameters
    Given a UniversalCommand definition
    When I specify name, description, and parameters
    Then the command should validate parameter types
    And provide TypeScript type inference

  Scenario: Execute command with validated input
    Given a defined UniversalCommand
    When execute() is called with parameters
    Then parameters should be validated against schema
    And the handler should receive typed parameters
    And the result should be returned

  Scenario: Handle validation errors
    Given a command with required parameters
    When execute() is called without required params
    Then a ValidationError should be thrown
    And the error should list missing parameters

  Scenario: Support default parameter values
    Given a command with optional parameters
    And parameters have default values
    When execute() is called without those params
    Then default values should be applied
```

### Non-Functional Requirements

- Type safety: Full TypeScript inference for parameters and results
- Performance: Handler execution should add <1ms overhead
- Extensibility: Support custom validators and transformers

## Implementation

See: `src/UniversalCommand.ts`

## Test Coverage

- `src/UniversalCommand.test.ts` - 20 tests covering all scenarios
