---
id: REQ-UC-005
title: Testing Utilities for Command Validation
status: Done
priority: Medium
category: testing
tests:
  - src/testing/index.test.ts
created: '2026-01-09'
updated: '2026-01-11'
---

# REQ-UC-005: Testing Utilities

## Summary

Provide utilities to test UniversalCommands without spinning up full CLI/API/MCP infrastructure.

## Requirements

```gherkin
Feature: Command Testing
  As a developer
  I want to test my commands in isolation
  So that I can verify behavior without full integration

  Scenario: Test command execution
    Given a UniversalCommand
    When I use testCommand() utility
    Then I can execute with mock parameters
    And I receive the execution result

  Scenario: Test validation
    Given a command with validation rules
    When I use testValidation() utility
    Then I can verify valid inputs pass
    And invalid inputs return errors

  Scenario: Mock scope context
    Given a command that requires scopes
    When I provide mock scope values
    Then the command executes with mocked context

  Scenario: Assert command structure
    Given a UniversalCommand
    When I use assertCommand() utility
    Then I can verify:
      - Required parameters are defined
      - Descriptions are present
      - Handler is callable
```

## Implementation

See: `src/testing/index.ts`

## Test Coverage

- `src/testing/index.test.ts` - 9 tests
