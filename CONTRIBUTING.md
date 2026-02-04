# Contributing to @supernal/universal-command

Thank you for your interest in contributing to Universal Command! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/supernalintelligence/universal-command.git
cd universal-command
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

4. Run tests:

```bash
pnpm test
```

## Development Workflow

### Running in Watch Mode

For development, you can run the build in watch mode:

```bash
pnpm dev
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Code Style

- We use [Prettier](https://prettier.io/) for code formatting
- We use [ESLint](https://eslint.org/) for linting
- Pre-commit hooks automatically format and lint staged files

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:

```
feat: add streaming support to CLI generator
fix: resolve validation error for optional parameters
docs: update API reference for ExecutionContext
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm test -- src/core/UniversalCommand.test.ts

# Run with coverage
pnpm test -- --coverage
```

### Writing Tests

- Place tests alongside source files with `.test.ts` extension
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Test both success and error cases

## Project Structure

```
src/
├── core/           # Core UniversalCommand and CommandRegistry
├── generators/     # Interface generators (CLI, API, MCP)
├── codegen/        # Code generation utilities
├── runtime/        # Runtime server implementation
├── scopes/         # Scope management
├── testing/        # Testing utilities
└── index.ts        # Public API exports
```

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes following the code style guidelines
3. Add or update tests as needed
4. Ensure all tests pass: `pnpm test:ci`
5. Ensure type checking passes: `pnpm type-check`
6. Submit a pull request with a clear description

### PR Requirements

- All tests must pass
- Type checking must pass
- Code must be formatted (handled by pre-commit hooks)
- Include relevant documentation updates

## Reporting Issues

When reporting issues, please include:

- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Node.js and package versions
- Relevant code snippets or error messages

## Feature Requests

We welcome feature requests! Please:

- Check existing issues first to avoid duplicates
- Describe the use case and motivation
- Provide examples of how the feature would be used

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- Open a [GitHub Issue](https://github.com/supernalintelligence/universal-command/issues)
- Email: support@supernal.ai
- Discord: [discord.gg/supernal](https://discord.gg/supernal)
