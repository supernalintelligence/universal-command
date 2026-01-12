---
id: REQ-UC-002
title: Command Registry for Multi-Command Management
status: Done
priority: High
category: core
upstream_ref: https://github.com/supernalintelligence/supernal-coding/blob/main/docs/architecture/decisions/2026-01-09-unified-cli-api-mcp-abstraction.md
tests:
  - src/CommandRegistry.test.ts
created: '2026-01-09'
updated: '2026-01-11'
---

# REQ-UC-002: Command Registry

## Summary

Organize and discover multiple UniversalCommands by category, name, or capability.

## Requirements

```gherkin
Feature: Command Registry
  As a developer building multi-command applications
  I want to organize commands in a registry
  So that I can discover and generate interfaces automatically

  Scenario: Register a command
    Given a CommandRegistry instance
    When I register a UniversalCommand
    Then the command should be retrievable by name
    And the command should be listed in getAll()

  Scenario: Organize by category
    Given multiple commands with different categories
    When I query commands by category
    Then only commands in that category are returned

  Scenario: Prevent duplicate registration
    Given a command already registered
    When I try to register another with the same name
    Then an error should be thrown

  Scenario: Bulk registration
    Given an array of UniversalCommands
    When I call registerAll()
    Then all commands should be registered

  Scenario: Query command metadata
    Given registered commands
    When I call getMetadata()
    Then I receive name, description, category for each
```

## Implementation

See: `src/CommandRegistry.ts`

## Test Coverage

- `src/CommandRegistry.test.ts` - 16 tests
