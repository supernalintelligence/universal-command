# Supernal Coding Repository

This is the **supernal-coding** root repository - the development workflow CLI system.

## Quick Reference

### Build & Run

```bash
# Full build (recommended for first setup)
./BUILDME.sh

# Verify installation
pnpm run verify
sc --version

# Run tests
pnpm test
# OR with evidence logging
sc test
```

### Key Directories

| Path                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `supernal-code-package/`      | Core CLI package (submodule)                       |
| `apps/supernal-dashboard/`    | Next.js dashboard app                              |
| `apps/supernal-landing-page/` | Marketing site                                     |
| `packages/interface-core/`    | Shared UI components                               |
| `docs/`                       | Documentation, SOPs, requirements                  |
| `.cursor/rules/`              | Rule files (compiled to USE_SUPERNAL_INTERFACE.md) |

### Tech Stack

- **Runtime**: Node.js 18+
- **Package Manager**: pnpm (workspaces)
- **Framework**: Next.js 14 (dashboard)
- **Testing**: Jest
- **CLI**: Commander.js

### Common Tasks

```bash
# Start dashboard locally
cd apps/supernal-dashboard && pnpm dev

# Build all packages
pnpm run build:packages

# Run specific test
sc test path/to/test.test.js

# Validate project
sc validate --all
```

### Submodules

This repo uses git submodules. Always clone with `--recursive`:

```bash
git clone --recursive <repo-url>
# Or if already cloned:
git submodule update --init --recursive
```

### Supernal Interface Rules

See [USE_SUPERNAL_CODING.md](./USE_SUPERNAL_CODING.md) for the complete workflow rules and coding standards used by AI agents in this repository.

---

For detailed documentation, visit [code.supernal.ai](https://code.supernal.ai)
