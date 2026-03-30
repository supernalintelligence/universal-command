# Universal Command CLI Migration Backlog

Goal: enable hard migration of Supernal Coding CLI to universal-command with no inline bridges and no performance regressions.

This backlog captures SDK gaps found in the audit and lists work required before SC can migrate fully.

## P0 - Blocking (Hard migration not viable without these)

1) Proper subcommand trees
- Problem: `UniversalCommand.toCLI()` treats `schema.name` as a single command name.
  Names like `health context` become a `health` command with a required argument, not a `health context` subcommand.
- Need: a CLI registry/builder that supports multi-segment command trees.
- Suggested change:
  - Add `schema.cli.path?: string[]` or parse `schema.name` into path segments.
  - Build nested Commander subcommands instead of a single command.

2) Positional and variadic args
- Problem: universal-command only supports `--flags`, no positional args or variadic targets.
- Need: schema support for positional args (name, required, variadic, description, type coercion).
- Suggested change:
  - Extend `CommandSchema.input` with `positionals?: Array<{ name, required, variadic, type, description }>`.
  - Map to Commander `command.argument()` definitions.

3) Lazy handler loading for startup performance
- Problem: registry instantiation eagerly loads command modules.
- Need: a lazy command wrapper where handler or command module is resolved only on invocation.
- Suggested change:
  - Add `UniversalCommand.lazy(() => Promise<UniversalCommand>)` or `LazyUniversalCommand` that stores loader.
  - CLI builder uses lazy loader, only importing on action.

4) Streaming output support
- Problem: CLI runtime ignores `output.type: 'stream'` and `CLIOptions.streaming`.
- Need: streaming API from handler to CLI stdout/stderr with backpressure.
- Suggested change:
  - Introduce `ExecutionContext.stream` or `context.write()` callbacks.
  - Define `output.type: 'stream'` contract that allows handler to emit chunks.

5) CLI interactivity (stdin/TTY)
- Problem: no stdin or TTY support in `ExecutionContext`.
- Need: pass `stdin` and `isTTY`, and optionally a prompt adapter.
- Suggested change:
  - Extend `ExecutionContext` with `stdin?: Readable`, `isTTY?: boolean`.
  - Add opt-in prompt helper interface.

6) allowUnknownOption / pass-through
- Problem: some CLI commands require unknown flag pass-through to subprocesses.
- Need: per-command setting equivalent to Commander `allowUnknownOption()` and `passThroughOptions()`.
- Suggested change:
  - Add `cli.allowUnknownOption?: boolean` and `cli.passThroughOptions?: boolean`.

## P1 - High priority (required for full parity)

7) Exit code mapping and error contracts
- Need: ability for handlers to set exit codes without throwing opaque errors.
- Suggested change:
  - Standardize `CommandError` with `exitCode`, `message`, `details`.
  - In CLI runner, map `CommandError.exitCode` to process exit.

8) Global options and pre/post hooks
- Need: program-level flags (e.g., `--yes-to-rules`) and global hooks (telemetry, rule interception).
- Suggested change:
  - Add `createCLIProgram({ globalOptions, hooks })` to CLI generator.

9) Fast help generation
- Need: help output without loading command modules.
- Suggested change:
  - Ensure lazy command metadata is available in registry without importing handlers.

10) Output formatting for rich CLI UX
- Need: allow commands to output tables/progress without duplicating logic.
- Suggested change:
  - Allow `cli.format` to receive a structured formatter helper or output writer.

## P2 - Compatibility / Quality

11) Command aliasing with subcommand paths
- Need: aliasing should work for nested commands and map to the same action.

12) Scope-aware CLI discovery
- Optional: reuse scope registry for CLI to avoid listing rarely-used commands by default.

13) Typed validation improvements
- Need: richer validation errors with parameter path and usage hints.

14) CLI testing harness
- Need: test helper for CLI parsing, exit code, and stdout/stderr snapshotting.

## Migration Strategy (Once P0/P1 Are Done)

- Phase A: Move read-only commands first (health, rules export, traceability, search).
- Phase B: Move non-interactive write commands (docs, audit, validation).
- Phase C: Move interactive and subprocess-heavy commands (init, workflow, git, build/test/run).

## Performance Requirements

- All CLI commands must support lazy loading of handlers.
- Startup should not import heavy modules.
- Registry build must be fast and file-system minimal.

---

## Current State (2026-01-16)

### Completed
- CLI inventory now auto-generated from CommandRegistry; output is `docs/cli/command-inventory.md`.
- Inventory generation is hash-based with watch support:
  - `scripts/update-cli-command-inventory.js`
  - Scripts: `docs:cli-inventory`, `docs:cli-inventory:watch`, `docs:cli-inventory:check`
- Safe merge now lives at `sc git merge`; worktree merge moved to `sc git worktree merge` with queue commands under `sc git worktree`.
- Duplicate command files removed:
  - `supernal-code-package/src/cli/commands/logs/query.ts`
  - `supernal-code-package/src/cli/commands/compliance/cli.ts`
- `sc test audit --skipped` added and used by tests; `sc audit` no longer hosts skipped-tests.
- Chat command respects `SUPERNAL_HOME` and refreshes paths to avoid test/home mismatch.

### Known Gaps / Follow-ups
- `docs/workflow/sops/general/SOP-0.1.12-git-workflow.md` still references `sc git merge` for worktree merges; update to `sc git worktree merge` where `--to=main` is used.
- `docs/features/developer-tooling/git-consolidation-implementation-plan.md` updated to show worktree merge split (done).
- `docs/cli/command-inventory.md` is generated; do not manually edit. Use the generator scripts.
- Consider adding a CI hook to run `docs:cli-inventory:check` after build to keep inventory current.
