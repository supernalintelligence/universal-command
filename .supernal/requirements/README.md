# Requirements

This package uses the [Supernal Coding](https://github.com/supernalintelligence/supernal-coding) workflow system for requirement tracking and test traceability.

## Requirement Summary

| ID                                                 | Title                  | Status | Tests |
| -------------------------------------------------- | ---------------------- | ------ | ----- |
| [REQ-UC-001](req-uc-001-universal-command-core.md) | Universal Command Core | Done   | 20    |
| [REQ-UC-002](req-uc-002-command-registry.md)       | Command Registry       | Done   | 16    |
| [REQ-UC-003](req-uc-003-code-generators.md)        | Code Generators        | Done   | 18    |
| [REQ-UC-004](req-uc-004-scope-registry.md)         | Scope Registry         | Done   | 30    |
| [REQ-UC-005](req-uc-005-testing-utilities.md)      | Testing Utilities      | Done   | 9     |

**Total: 93 tests across 5 requirements**

## Upstream Reference

This package implements the architecture defined in:

- [Unified CLI-API-MCP Abstraction ADR](https://github.com/supernalintelligence/supernal-coding/blob/main/docs/architecture/decisions/2026-01-09-unified-cli-api-mcp-abstraction.md)

## Workflow

Requirements follow the Gherkin specification format:

- Each requirement has scenarios describing expected behavior
- Tests are linked in the frontmatter (`tests:` field)
- Status tracks implementation progress

See [Supernal Coding documentation](https://supernal.ai/docs) for full workflow details.
