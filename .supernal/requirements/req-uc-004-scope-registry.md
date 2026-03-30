---
id: REQ-UC-004
title: Scope Registry for Multi-Tenant Context
status: Done
priority: Medium
category: scopes
upstream_ref: https://github.com/supernalintelligence/supernal-coding/blob/main/docs/architecture/decisions/2026-01-09-unified-cli-api-mcp-abstraction.md
tests:
  - src/scopes/ScopeRegistry.test.ts
created: '2026-01-09'
updated: '2026-01-11'
---

# REQ-UC-004: Scope Registry

## Summary

Manage execution context (tenant IDs, user sessions, feature flags) for commands operating in multi-tenant or multi-user environments.

## Requirements

```gherkin
Feature: Scope Registration
  As a developer building multi-tenant applications
  I want to define scopes that commands can access
  So that I can isolate data by tenant/user

  Scenario: Register a scope
    Given a ScopeRegistry instance
    When I register a scope with name and resolver
    Then the scope should be available for commands

  Scenario: Resolve scope at execution
    Given a registered scope with resolver function
    When a command executes
    Then the scope value is resolved from context
    And the command receives the resolved value

  Scenario: Validate scope values
    Given a scope with validation function
    When the resolved value fails validation
    Then execution should be blocked
    And an error should indicate which scope failed

Feature: Command Scope Requirements
  As a developer
  I want to specify which scopes a command needs
  So that context is automatically provided

  Scenario: Command declares scope requirements
    Given a command with scopes: ['tenant']
    When the command executes
    Then tenant scope must be resolved
    And execution fails if scope cannot be resolved

  Scenario: Optional scopes
    Given a command with optional scope
    When scope cannot be resolved
    Then execution continues with undefined scope value
```

## Implementation

See: `src/scopes/ScopeRegistry.ts`

## Test Coverage

- `src/scopes/ScopeRegistry.test.ts` - 30 tests
