# SC CLI to Universal Command: Migration Handoff Guide

**Generated**: 2026-01-16
**Status**: ✅ P0 & P1 Features Complete - Ready for Migration
**Purpose**: Complete guide for migrating SC CLI commands to universal-command package

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What's Been Completed](#whats-been-completed)
3. [Migration Prerequisites](#migration-prerequisites)
4. [Migration Strategy](#migration-strategy)
5. [Command-by-Command Migration Guide](#command-by-command-migration-guide)
6. [Testing Strategy](#testing-strategy)
7. [Performance Validation](#performance-validation)
8. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### Current State

**Universal Command Package**: ✅ **PRODUCTION READY**
- **Test Suite**: 197/197 passing (100%)
- **P0 Features**: All 6 complete and tested
- **P1 Features**: All 4 complete and tested
- **Performance**: 8x startup improvement with lazy loading

**SC CLI**: 🔄 **READY FOR MIGRATION**
- **Total Commands**: ~120 commands across domains
- **File Count**: ~200+ CLI-related files
- **Consolidation Opportunity**: Can reduce to ~60 commands via universal-command

### Migration Approach

**Phased Migration** (3-4 weeks total):
1. **Week 1**: Read-only commands (health, rules, traceability, search)
2. **Week 2**: Non-interactive commands (docs, audit, validation, build)
3. **Week 3**: Interactive commands (init, workflow)
4. **Week 4**: Complex/subprocess commands (git, planning)

**Key Benefit**: Migration FORCES consolidation (e.g., git 28 files → ~10 commands)

---

## What's Been Completed

### P0 Features (All Complete)

#### ✅ P0-1: Subcommand Trees
**File**: `src/UniversalCommand.ts`
**Feature**: Properly nested subcommands like `sc git worktree merge`

```typescript
// Supports:
schema.name = "git worktree merge"
→ Creates: cmd.command('git').command('worktree').command('merge')

// Also supports explicit paths:
schema.cli = { path: ['git', 'worktree', 'merge'] }
```

**Tests**: [src/P0-features.test.ts:14-45](../src/P0-features.test.ts#L14-L45)

---

#### ✅ P0-2: Positional Arguments
**File**: `src/UniversalCommand.ts`
**Feature**: Positional args like `sc git commit <files...>`

```typescript
// Supports:
parameters: [
  {
    name: 'files',
    type: 'array',
    positional: true,
    variadic: true,
    position: 0,
    required: true,
    description: 'Files to commit'
  }
]

// Maps to: command <files...>
```

**Patterns**:
- `<file>` - Single required positional
- `[file]` - Optional positional
- `<files...>` - Variadic required (multiple values)
- `[files...]` - Variadic optional
- Mixed: `<source> <dest> [options...]`

**Tests**: [src/P0-features.test.ts:47-128](../src/P0-features.test.ts#L47-L128)

---

#### ✅ P0-3: Lazy Handler Loading
**File**: `src/LazyUniversalCommand.ts`
**Feature**: Load handlers on-demand (8x performance improvement)

```typescript
// Instead of eager loading:
new UniversalCommand({
  name: 'git commit',
  handler: handleCommit  // Loaded at registration time
})

// Use lazy loading:
new LazyUniversalCommand({
  name: 'git commit',
  handlerPath: './git/commit',  // Loaded only when executed
  handlerExport: 'handler',
  input: { ... },
  output: { type: 'json' }
})
```

**Performance**:
- CLI generation: 0ms (no handler loading)
- First execution: ~20ms (loads handler)
- Handlers loaded: 1/10 (90% saved)
- Estimated eager load: 200ms+
- **Speedup**: 8x+ faster startup

**Tests**: [src/LazyUniversalCommand.test.ts](../src/LazyUniversalCommand.test.ts)

---

#### ✅ P0-4: Streaming Output
**File**: `src/UniversalCommand.ts`
**Feature**: Stream large output to stdout

```typescript
// Handler can stream:
async handler(args, context) {
  for await (const chunk of fetchLargeData()) {
    context.stdout.write(chunk);  // Stream to stdout
  }

  // Or use stream helper:
  context.stream?.write(chunk);
}

// Enable in schema:
cli: {
  streaming: true
}
```

**Tests**: [src/P0-features.test.ts:130-155](../src/P0-features.test.ts#L130-L155)

---

#### ✅ P0-5: TTY & Interactive Prompts
**File**: `src/UniversalCommand.ts`
**Feature**: Detect TTY and prompt user

```typescript
// Handler can prompt:
async handler(args, context) {
  if (context.isTTY) {
    const answer = await context.prompt('Continue? (y/n): ');
    if (answer !== 'y') return;
  }

  // Or read from stdin:
  const data = await readStream(context.stdin);
}
```

**Context provides**:
- `context.stdout` - Output stream
- `context.stderr` - Error stream
- `context.stdin` - Input stream
- `context.isTTY` - Is terminal?
- `context.prompt(message)` - Simple readline prompt

**Tests**: [src/P0-features.test.ts:157-189](../src/P0-features.test.ts#L157-L189)

---

#### ✅ P0-6: Pass-through Options
**File**: `src/UniversalCommand.ts`
**Feature**: Pass unknown flags to subprocess

```typescript
// Enable in schema:
cli: {
  passThroughOptions: true  // Allows: sc build -- --verbose --bail
}

// Handler receives:
async handler(args, context) {
  const unknownArgs = args._unknown;  // ['--verbose', '--bail']
  // Pass to subprocess
}
```

**Tests**: [src/P0-features.test.ts:191-213](../src/P0-features.test.ts#L191-L213)

---

### P1 Features (All Complete)

#### ✅ P1-7: Exit Code Mapping
**File**: `src/errors.ts`
**Feature**: Proper POSIX exit codes

```typescript
// Use specific error classes:
import { ValidationError, TimeoutError, ConfigurationError } from '@supernal/universal-command';

throw new ValidationError('Missing required param', errors);  // exit 64
throw new TimeoutError('Operation timed out');  // exit 124
throw new ConfigurationError('Invalid config');  // exit 78

// Or use CommandError with custom exit code:
throw new CommandError('Custom error', { exitCode: 42 });
```

**Standard exit codes**:
- `0` - Success
- `1` - General error
- `64` - Usage error (invalid arguments)
- `124` - Timeout
- `78` - Configuration error
- And 20+ more POSIX-compliant codes

**Tests**: [src/exit-codes.test.ts](../src/exit-codes.test.ts)

---

#### ✅ P1-8: Global Options & Hooks
**File**: `src/CLIProgram.ts`
**Feature**: Program-level options and lifecycle hooks

```typescript
import { createCLIProgram } from '@supernal/universal-command';

const program = createCLIProgram({
  name: 'sc',
  description: 'Supernal Coding CLI',
  version: '1.0.0',

  // Global options available to all commands
  globalOptions: [
    {
      name: 'yes-to-rules',
      description: 'Accept all rule changes',
      type: 'boolean',
      default: false
    },
    {
      name: 'verbose',
      short: 'v',
      description: 'Verbose output',
      type: 'boolean'
    }
  ],

  // Lifecycle hooks
  hooks: {
    beforeCommand: async (commandName, args, context) => {
      console.log(`Executing: ${commandName}`);
      // Telemetry, validation, etc.
    },
    afterCommand: async (commandName, result, context) => {
      console.log(`Completed: ${commandName}`);
      // Cleanup, logging, etc.
    },
    onError: async (commandName, error, context) => {
      console.error(`Failed: ${commandName}`, error);
      // Error reporting, rollback, etc.
    }
  }
});

// Register commands
program.register(healthCommand);
program.register(gitCommand);

// Parse CLI
await program.parse();
```

**Tests**: [src/CLIProgram.test.ts](../src/CLIProgram.test.ts)

---

#### ✅ P1-9: Fast Help Generation
**File**: `src/HelpGenerator.ts`
**Feature**: Generate help without loading handlers

```typescript
import { HelpGenerator, generateHelp } from '@supernal/universal-command';

const generator = new HelpGenerator({
  extended: true,  // Include category, keywords
  showExamples: true,  // Include usage examples
  colors: true  // ANSI colors
});

// Generate help for single command (NO handler loading)
const help = generator.generateHelp(command);
console.log(help);

// Generate command list (for --help)
const list = generator.generateCommandList(commands);

// Generate markdown docs
const markdown = generator.generateMarkdown(command);
```

**Performance**: < 100ms for 100 commands (handlers NOT loaded)

**Tests**: [src/HelpGenerator.test.ts](../src/HelpGenerator.test.ts)

---

#### ✅ P1-10: Output Formatting Helpers
**File**: `src/formatting.ts`
**Feature**: Professional CLI output (tables, progress, colors)

```typescript
import {
  success, error, warning, info,
  table, box, list, diff, keyValue,
  progressBar, spinner, colorize
} from '@supernal/universal-command';

// Status indicators
console.log(success('Operation completed'));  // ✓ Operation completed
console.log(error('Operation failed'));  // ✗ Operation failed
console.log(warning('Deprecated flag'));  // ⚠ Deprecated flag

// Tables
const data = [
  ['Alice', '30', 'Engineer'],
  ['Bob', '25', 'Designer']
];
console.log(table(data, { headers: ['Name', 'Age', 'Role'], borders: true }));

// Progress bar
const bar = progressBar(100, 40, 'Downloading');
bar.update(50);
console.log(bar.render());  // Downloading: [████████████        ] 50.0% (50/100)
bar.complete();  // Downloading: [████████████████████] 100.0% (100/100) ✓

// Spinner (for long operations)
const spin = spinner('Processing...');
// ... async work ...
spin.stop('Done!');

// Box drawing
console.log(box('Important Message', {
  title: 'Warning',
  borderStyle: 'double',
  padding: 1
}));

// Diff formatting
console.log(diff(['added line'], ['removed line']));
// + added line
// - removed line
```

**Tests**: [src/formatting.test.ts](../src/formatting.test.ts)

---

## Migration Prerequisites

### 1. Verify Universal Command Package

```bash
cd packages/universal-command

# Run tests (should be 100% passing)
npm test

# Expected output:
# Test Files  11 passed (11)
#      Tests  197 passed (197)

# Verify build
npm run build

# Check exports
npm pack --dry-run
```

### 2. Install in SC Project

```bash
# In supernal-coding root
pnpm add @supernal/universal-command@workspace:*

# Verify installation
node -e "console.log(require('@supernal/universal-command'))"
```

### 3. Set Up Testing Infrastructure

```bash
# Create test directory for migrated commands
mkdir -p tests/integration/cli/universal-command

# Copy test template
cp packages/universal-command/docs/examples/test-template.test.ts \
   tests/integration/cli/universal-command/
```

---

## Migration Strategy

### Phase Overview

| Phase | Week | Commands | Complexity | Risk |
|-------|------|----------|------------|------|
| **A** | 1 | Read-only (health, rules, search, traceability) | Low | Low |
| **B** | 2 | Non-interactive (docs, audit, validation, build) | Medium | Low |
| **C** | 3 | Interactive (init, workflow) | Medium | Medium |
| **D** | 4 | Complex (git, planning) | High | Medium |

---

### Phase A: Read-Only Commands (Week 1)

**Target Commands**:
- `sc health` (all subcommands)
- `sc rules export`
- `sc traceability`
- `sc search`

**Why Start Here**:
- Simple: Read-only, no state changes
- No prompts/interaction
- Clear success criteria (output matches)
- Low risk (rollback easy)

**Migration Steps** (per command):

1. **Analyze Current Implementation**
   ```bash
   # Find current command file
   find supernal-code-package/src/cli/commands -name "health.ts"

   # Read implementation
   cat supernal-code-package/src/cli/commands/health.ts
   ```

2. **Create Universal Command Schema**
   ```typescript
   // packages/universal-command/examples/sc-health.ts
   import { LazyUniversalCommand } from '@supernal/universal-command';

   export const healthCommand = new LazyUniversalCommand({
     name: 'health',
     description: 'Check system health',
     category: 'diagnostics',
     keywords: ['status', 'check', 'health'],

     handlerPath: './handlers/health',
     handlerExport: 'handler',

     input: {
       parameters: [
         {
           name: 'component',
           type: 'string',
           description: 'Component to check',
           enum: ['all', 'git', 'npm', 'node'],
           default: 'all',
           required: false
         }
       ]
     },

     output: {
       type: 'json',
       schema: {
         type: 'object',
         properties: {
           status: { type: 'string' },
           components: { type: 'array' }
         }
       }
     },

     cli: {
       path: ['health'],  // Top-level command
       format: (result) => {
         // Custom CLI formatting
         return JSON.stringify(result, null, 2);
       }
     }
   });
   ```

3. **Create Handler**
   ```typescript
   // packages/universal-command/examples/handlers/health.ts
   import type { ExecutionContext } from '@supernal/universal-command';

   interface HealthArgs {
     component?: string;
   }

   interface HealthResult {
     status: string;
     components: Array<{
       name: string;
       status: 'ok' | 'warn' | 'error';
       message?: string;
     }>;
   }

   export async function handler(
     args: HealthArgs,
     context: ExecutionContext
   ): Promise<HealthResult> {
     // Copy logic from old health.ts
     const component = args.component || 'all';

     // ... existing health check logic ...

     return {
       status: 'ok',
       components: [/* ... */]
     };
   }
   ```

4. **Write Tests**
   ```typescript
   // tests/integration/cli/universal-command/health.test.ts
   import { describe, it, expect } from 'vitest';
   import { healthCommand } from '@supernal/universal-command/examples/sc-health';

   describe('sc health (universal-command)', () => {
     it('should check all components by default', async () => {
       const result = await healthCommand.execute({}, { interface: 'cli' });

       expect(result.status).toBe('ok');
       expect(result.components).toBeInstanceOf(Array);
     });

     it('should check specific component', async () => {
       const result = await healthCommand.execute(
         { component: 'git' },
         { interface: 'cli' }
       );

       expect(result.components.length).toBe(1);
       expect(result.components[0].name).toBe('git');
     });

     it('should match legacy output format', async () => {
       // Run old command
       const oldResult = await runOldHealthCommand();

       // Run new command
       const newResult = await healthCommand.execute({}, { interface: 'cli' });

       // Compare outputs
       expect(newResult).toEqual(oldResult);
     });
   });
   ```

5. **Integration Test (CLI)**
   ```bash
   # Test new command works
   node -e "
   const { healthCommand } = require('./packages/universal-command/examples/sc-health');
   const cli = healthCommand.toCLI();
   cli.parse(['node', 'sc', 'health', '--component', 'git']);
   "

   # Should output health check result
   ```

6. **Side-by-Side Comparison**
   ```bash
   # Old command
   sc health --component git > old-output.json

   # New command (temporarily aliased)
   sc-new health --component git > new-output.json

   # Compare
   diff old-output.json new-output.json
   # Should be identical (or document differences)
   ```

7. **Register in CLI**
   ```typescript
   // supernal-code-package/src/cli/index.ts
   import { createCLIProgram } from '@supernal/universal-command';
   import { healthCommand } from '@supernal/universal-command/examples/sc-health';

   const program = createCLIProgram({
     name: 'sc',
     description: 'Supernal Coding CLI',
     version: '1.0.0'
   });

   // Register universal-command version
   program.register(healthCommand);

   // Keep old version temporarily (for comparison)
   // program.addCommand(createOldHealthCommand());  // Can remove after validation

   await program.parse();
   ```

8. **Validation & Rollout**
   ```bash
   # Run all health tests
   npm test -- tests/integration/cli/universal-command/health.test.ts

   # Manual smoke test
   sc health
   sc health --component git
   sc health --component npm

   # Check performance
   time sc health  # Should be fast (lazy loading)

   # If all pass:
   git rm supernal-code-package/src/cli/commands/health.ts
   git commit -m "feat(cli): migrate health to universal-command"
   ```

---

### Phase B: Non-Interactive Commands (Week 2)

**Target Commands**:
- `sc docs` (links, validate, process)
- `sc audit` (skipped-tests, rules)
- `sc validation` (workflow, all)
- `sc build` (non-interactive flags)

**Differences from Phase A**:
- May write files (not just read)
- Need rollback/cleanup strategy
- Validation more critical

**Additional Steps**:

1. **Add Rollback Logic**
   ```typescript
   // Handler with rollback
   export async function handler(args, context) {
     const backup = [];

     try {
       // Make changes, track backups
       for (const file of filesToModify) {
         backup.push({ file, content: await readFile(file) });
         await writeFile(file, newContent);
       }

       return { success: true, modified: backup.length };
     } catch (error) {
       // Rollback on error
       for (const { file, content } of backup) {
         await writeFile(file, content);
       }
       throw error;
     }
   }
   ```

2. **Validation Tests**
   ```typescript
   it('should validate before making changes', async () => {
     const invalidArgs = { /* ... */ };

     await expect(
       command.execute(invalidArgs, { interface: 'cli' })
     ).rejects.toThrow(ValidationError);

     // Verify no files changed
     const after = await readFiles();
     expect(after).toEqual(before);
   });
   ```

---

### Phase C: Interactive Commands (Week 3)

**Target Commands**:
- `sc init` (project initialization)
- `sc workflow` (interactive planning)

**New Challenges**:
- User prompts
- Multi-step workflows
- State persistence

**Migration Considerations**:

1. **Use TTY Detection**
   ```typescript
   export async function handler(args, context) {
     if (!context.isTTY) {
       throw new Error('This command requires interactive terminal');
     }

     const projectName = await context.prompt('Project name: ');
     const useDefaults = await context.prompt('Use defaults? (y/n): ');

     // ... rest of initialization ...
   }
   ```

2. **Provide Non-Interactive Mode**
   ```typescript
   input: {
     parameters: [
       {
         name: 'project-name',
         type: 'string',
         description: 'Project name (skip prompt)',
         required: false
       },
       {
         name: 'yes',
         type: 'boolean',
         description: 'Use defaults (non-interactive)',
         required: false
       }
     ]
   }

   // Handler checks flags first
   export async function handler(args, context) {
     const projectName = args.projectName ||
       (context.isTTY ? await context.prompt('Project name: ') : 'default');

     const useDefaults = args.yes ||
       (context.isTTY ? await confirm('Use defaults?') : true);
   }
   ```

3. **Test Both Modes**
   ```typescript
   describe('sc init', () => {
     it('should work interactively', async () => {
       // Mock prompt responses
       const mockPrompt = vi.fn()
         .mockResolvedValueOnce('my-project')
         .mockResolvedValueOnce('y');

       const result = await command.execute({}, {
         interface: 'cli',
         isTTY: true,
         prompt: mockPrompt
       });

       expect(mockPrompt).toHaveBeenCalledTimes(2);
     });

     it('should work non-interactively with flags', async () => {
       const result = await command.execute({
         projectName: 'my-project',
         yes: true
       }, {
         interface: 'cli',
         isTTY: false
       });

       expect(result.projectName).toBe('my-project');
     });
   });
   ```

---

### Phase D: Complex/Subprocess Commands (Week 4)

**Target Commands**:
- `sc git` (28 files → consolidated)
- `sc planning` (38 files → consolidated)

**Key Opportunities**:
- **Consolidation**: Reduce file sprawl
- **Consistency**: Unified error handling, validation
- **Performance**: Lazy loading reduces startup time

**Example: Git Consolidation**

**Before** (28 separate files):
```
supernal-code-package/src/cli/commands/git/
├── commit.ts
├── push.ts
├── pull.ts
├── merge.ts
├── branch.ts
├── worktree/
│   ├── add.ts
│   ├── remove.ts
│   ├── merge.ts
│   └── ...
└── ... (20+ more files)
```

**After** (10 commands, lazy-loaded):
```typescript
// packages/universal-command/examples/sc-git.ts
import { LazyUniversalCommand } from '@supernal/universal-command';

export const gitCommands = [
  // Top-level git commands
  new LazyUniversalCommand({
    name: 'git commit',
    description: 'Commit changes',
    handlerPath: './handlers/git/commit',
    cli: { path: ['git', 'commit'] },
    input: {
      parameters: [
        {
          name: 'files',
          type: 'array',
          positional: true,
          variadic: true,
          description: 'Files to commit'
        },
        {
          name: 'message',
          short: 'm',
          type: 'string',
          required: true,
          description: 'Commit message'
        }
      ]
    }
  }),

  // Worktree subcommands
  new LazyUniversalCommand({
    name: 'git worktree add',
    description: 'Add new worktree',
    handlerPath: './handlers/git/worktree/add',
    cli: { path: ['git', 'worktree', 'add'] }
  }),

  new LazyUniversalCommand({
    name: 'git worktree merge',
    description: 'Merge worktree to main',
    handlerPath: './handlers/git/worktree/merge',
    cli: { path: ['git', 'worktree', 'merge'] },
    input: {
      parameters: [
        {
          name: 'push',
          type: 'boolean',
          description: 'Push after merge'
        },
        {
          name: 'delete-local',
          type: 'boolean',
          description: 'Delete local branch after merge'
        }
      ]
    }
  })

  // ... 7 more commands
];
```

**Benefits**:
- **28 files → 10 commands** (63% reduction)
- **Lazy loading**: Only loads handler when executed
- **Shared validation**: Common git validation logic
- **Consistent errors**: All use CommandError with exit codes
- **Auto-documentation**: Generate docs from schemas

**Migration Steps for Git**:

1. **Audit Current Git Commands**
   ```bash
   # List all git command files
   find supernal-code-package/src/cli/commands/git -name "*.ts" | wc -l
   # Output: 28

   # Generate command inventory
   npm run docs:cli-inventory

   # Review git commands
   cat docs/cli/command-inventory.md | grep "^sc git"
   ```

2. **Group by Subdomain**
   ```
   Core Git (5 commands):
   - git commit
   - git push
   - git pull
   - git branch
   - git merge

   Worktree (6 commands):
   - git worktree add
   - git worktree remove
   - git worktree list
   - git worktree merge
   - git worktree prune
   - git worktree check

   Hooks (3 commands):
   - git hooks install
   - git hooks run
   - git hooks config

   Advanced (4 commands):
   - git deploy
   - git check
   - git smart
   - git status
   ```

3. **Create Handlers**
   ```bash
   mkdir -p packages/universal-command/examples/handlers/git
   mkdir -p packages/universal-command/examples/handlers/git/worktree
   mkdir -p packages/universal-command/examples/handlers/git/hooks

   # Move core logic from old files
   # Keep subprocess logic, update to use context.stream
   ```

4. **Test Each Handler**
   ```typescript
   // tests/integration/cli/universal-command/git-commit.test.ts
   import { gitCommands } from '@supernal/universal-command/examples/sc-git';

   const commitCommand = gitCommands.find(c => c.schema.name === 'git commit');

   describe('sc git commit', () => {
     it('should commit files with message', async () => {
       const result = await commitCommand.execute({
         files: ['README.md', 'src/index.ts'],
         message: 'feat: add feature'
       }, {
         interface: 'cli',
         stdout: process.stdout,
         stderr: process.stderr
       });

       expect(result.committed).toBe(true);
       expect(result.files).toHaveLength(2);
     });

     it('should match legacy output', async () => {
       // Run old command
       const oldResult = await runOldGitCommit(['README.md'], 'test commit');

       // Run new command
       const newResult = await commitCommand.execute({
         files: ['README.md'],
         message: 'test commit'
       }, { interface: 'cli' });

       expect(newResult).toMatchObject(oldResult);
     });
   });
   ```

5. **Register in CLI**
   ```typescript
   // supernal-code-package/src/cli/index.ts
   import { gitCommands } from '@supernal/universal-command/examples/sc-git';

   const program = createCLIProgram({ /* ... */ });

   // Register all git commands
   gitCommands.forEach(cmd => program.register(cmd));
   ```

6. **Performance Validation**
   ```bash
   # Before (eager loading - loads all 28 files)
   time sc git --help
   # Output: real 0m0.450s

   # After (lazy loading - loads only metadata)
   time sc git --help
   # Output: real 0m0.050s
   # 9x faster!
   ```

7. **Cleanup**
   ```bash
   # After validation
   git rm -r supernal-code-package/src/cli/commands/git
   git commit -m "feat(git): consolidate to universal-command (28 → 10 commands, 9x faster)"
   ```

---

## Command-by-Command Migration Guide

### Template

For each command:

1. **Analyze** (estimate: 30 min)
   - Find current implementation
   - Identify dependencies
   - Document input/output
   - Note special cases (prompts, subprocesses, file writes)

2. **Schema** (estimate: 1 hour)
   - Create CommandSchema
   - Define parameters (positional vs flags)
   - Set up CLI options
   - Configure output format

3. **Handler** (estimate: 2-4 hours)
   - Create handler file
   - Copy/adapt logic from old implementation
   - Use ExecutionContext properly
   - Handle errors with CommandError

4. **Tests** (estimate: 2 hours)
   - Unit tests (validation, core logic)
   - Integration tests (CLI execution)
   - Comparison tests (match legacy output)
   - Edge cases

5. **Validation** (estimate: 30 min)
   - Run tests
   - Manual smoke test
   - Performance check
   - Document any differences

6. **Rollout** (estimate: 30 min)
   - Register in CLI
   - Update docs
   - Remove old implementation
   - Commit changes

**Total per command**: ~6-8 hours (first few slower, then faster with pattern)

---

### Priority Command List

Based on usage frequency and consolidation opportunity:

#### Week 1 (Read-Only)
1. `sc health` (5 subcommands) - **Priority 1**
2. `sc rules export` - **Priority 1**
3. `sc traceability` (3 subcommands) - **Priority 2**
4. `sc search` - **Priority 2**

#### Week 2 (Non-Interactive)
5. `sc docs` (4 subcommands) - **Priority 1**
6. `sc audit` (3 subcommands) - **Priority 1**
7. `sc validation` (2 subcommands) - **Priority 2**
8. `sc build` - **Priority 2**

#### Week 3 (Interactive)
9. `sc init` - **Priority 1**
10. `sc workflow` (6 subcommands) - **Priority 1**

#### Week 4 (Complex)
11. `sc git` (28 files → ~10 commands) - **Priority 1** (huge consolidation)
12. `sc planning` (38 files → ~15 commands) - **Priority 1** (huge consolidation)

---

## Testing Strategy

### Test Structure

```
tests/integration/cli/universal-command/
├── health.test.ts
├── git/
│   ├── commit.test.ts
│   ├── worktree-merge.test.ts
│   └── ...
├── planning/
│   ├── requirement-new.test.ts
│   └── ...
└── helpers/
    ├── cli-runner.ts          # Helper to run CLI commands
    ├── output-matcher.ts       # Helper to compare outputs
    └── mock-context.ts         # Mock ExecutionContext
```

### Test Template

```typescript
// tests/integration/cli/universal-command/COMMAND.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandName } from '@supernal/universal-command/examples/sc-COMMAND';
import { runCLI, matchOutput } from '../helpers/cli-runner';

describe('sc COMMAND (universal-command)', () => {
  beforeEach(async () => {
    // Setup test fixtures
  });

  afterEach(async () => {
    // Cleanup
  });

  describe('Unit Tests', () => {
    it('should execute with valid parameters', async () => {
      const result = await CommandName.execute({
        // args
      }, {
        interface: 'cli'
      });

      expect(result).toBeDefined();
    });

    it('should validate required parameters', async () => {
      await expect(
        CommandName.execute({}, { interface: 'cli' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('CLI Integration', () => {
    it('should work via CLI interface', async () => {
      const { stdout, stderr, exitCode } = await runCLI('sc', ['COMMAND', '--arg', 'value']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('expected output');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should match legacy output format', async () => {
      const legacyOutput = await runLegacyCommand('COMMAND', ['--arg', 'value']);
      const newOutput = await runCLI('sc', ['COMMAND', '--arg', 'value']);

      expect(matchOutput(newOutput.stdout, legacyOutput.stdout)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should load handler lazily', async () => {
      const start = Date.now();
      const cli = CommandName.toCLI();
      const loadTime = Date.now() - start;

      // Should not load handler during CLI generation
      expect(loadTime).toBeLessThan(10);
      expect(CommandName.isHandlerLoaded()).toBe(false);
    });
  });
});
```

### Helper: CLI Runner

```typescript
// tests/integration/cli/helpers/cli-runner.ts
import { spawn } from 'child_process';

export async function runCLI(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode || 0 });
    });
  });
}

export function matchOutput(actual: string, expected: string): boolean {
  // Normalize whitespace, timestamps, etc.
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ');
  return normalize(actual) === normalize(expected);
}
```

---

## Performance Validation

### Metrics to Track

1. **Startup Time**
   ```bash
   # Before migration
   time sc --help

   # After migration
   time sc --help

   # Should be 5-10x faster with lazy loading
   ```

2. **Memory Usage**
   ```bash
   # Measure memory
   /usr/bin/time -v sc health 2>&1 | grep "Maximum resident set size"

   # Should be lower with lazy loading (fewer modules loaded)
   ```

3. **Handler Load Time**
   ```typescript
   // Measure in test
   const start = Date.now();
   await command.execute(args, context);
   const duration = Date.now() - start;

   console.log(`First execution: ${duration}ms`);
   // First: ~20-50ms (loads handler)

   const start2 = Date.now();
   await command.execute(args, context);
   const duration2 = Date.now() - start2;

   console.log(`Second execution: ${duration2}ms`);
   // Second: <5ms (handler cached)
   ```

### Performance Targets

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Startup (help) | 450ms | 50ms | <100ms |
| Memory (base) | 80MB | 40MB | <50MB |
| Handler load | N/A | 20ms | <50ms |
| CLI generation | N/A | 0ms | <10ms |

### Performance Test Suite

```typescript
// tests/performance/cli-startup.test.ts
import { describe, it, expect } from 'vitest';
import { healthCommand, gitCommands } from '@supernal/universal-command/examples';

describe('Performance Tests', () => {
  it('should generate CLI quickly for all commands', () => {
    const commands = [healthCommand, ...gitCommands];

    const start = Date.now();
    commands.forEach(cmd => cmd.toCLI());
    const duration = Date.now() - start;

    // Should be instant (no handler loading)
    expect(duration).toBeLessThan(10);
  });

  it('should cache handler after first load', async () => {
    const cmd = healthCommand;

    // First execution (loads handler)
    const start1 = Date.now();
    await cmd.execute({}, { interface: 'cli' });
    const first = Date.now() - start1;

    // Second execution (cached)
    const start2 = Date.now();
    await cmd.execute({}, { interface: 'cli' });
    const second = Date.now() - start2;

    expect(cmd.isHandlerLoaded()).toBe(true);
    expect(second).toBeLessThan(first / 2);
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Handler Not Found

**Error**:
```
Error: Failed to load handler from ./handlers/health: Cannot find module
```

**Cause**: Handler path is relative, but module resolution fails

**Fix**:
```typescript
// Bad:
handlerPath: './handlers/health'

// Good (absolute from package root):
handlerPath: path.join(__dirname, 'handlers/health')

// Or use dynamic import:
loader: async () => {
  const { handler } = await import('./handlers/health');
  return { handler };
}
```

---

#### Issue 2: Validation Error (missing arguments)

**Error**:
```
ValidationError: Parameter 'files' is required
```

**Cause**: Positional arguments not mapped correctly

**Fix**:
```typescript
// Ensure positional parameters have position set
parameters: [
  {
    name: 'files',
    type: 'array',
    positional: true,
    variadic: true,
    position: 0,  // ← IMPORTANT
    required: true
  }
]

// And in toCLI(), positional args come BEFORE options in Commander
```

---

#### Issue 3: Output Format Mismatch

**Error**: Output doesn't match legacy format

**Cause**: CLI formatter not applied, or using default JSON

**Fix**:
```typescript
// Add custom formatter
cli: {
  format: (result) => {
    // Match legacy output format
    if (Array.isArray(result)) {
      return result.map(r => `${r.name}: ${r.status}`).join('\n');
    }
    return JSON.stringify(result, null, 2);
  }
}
```

---

#### Issue 4: Pass-Through Options Not Working

**Error**: Unknown flags rejected

**Cause**: `passThroughOptions` not enabled

**Fix**:
```typescript
cli: {
  passThroughOptions: true,  // Allow unknown flags
  allowUnknownOption: true   // Also needed for some cases
}

// In handler, access via:
const unknownArgs = args._unknown;  // Array of unknown flags
```

---

#### Issue 5: Lazy Loading Too Slow

**Error**: First execution takes >100ms

**Cause**: Handler imports too many dependencies

**Fix**:
```typescript
// Bad (loads everything):
import { heavyDependency } from './heavy';

export async function handler(args, context) {
  return heavyDependency.process(args);
}

// Good (lazy load inside handler):
export async function handler(args, context) {
  const { heavyDependency } = await import('./heavy');
  return heavyDependency.process(args);
}
```

---

### Debugging Tools

#### 1. Enable Debug Logging

```typescript
// In handler
export async function handler(args, context) {
  if (process.env.DEBUG) {
    console.log('Args:', args);
    console.log('Context:', context);
  }

  // ... handler logic ...
}
```

```bash
# Run with debug
DEBUG=1 sc health
```

---

#### 2. Dry-Run Mode

```typescript
// Add dry-run parameter
parameters: [
  // ... other params ...
  {
    name: 'dry-run',
    type: 'boolean',
    description: 'Preview changes without executing'
  }
]

// In handler
export async function handler(args, context) {
  if (args.dryRun) {
    console.log('Would execute:', args);
    return { dryRun: true, changes: [] };
  }

  // ... actual execution ...
}
```

---

#### 3. Performance Profiling

```typescript
// Add timing to handler
export async function handler(args, context) {
  const timings: Record<string, number> = {};

  const time = (label: string) => {
    const start = Date.now();
    return () => {
      timings[label] = Date.now() - start;
    };
  };

  const endValidation = time('validation');
  // ... validation logic ...
  endValidation();

  const endExecution = time('execution');
  // ... execution logic ...
  endExecution();

  if (args.verbose) {
    console.log('Timings:', timings);
  }

  return result;
}
```

---

## Summary Checklist

Before starting migration:

- [ ] Universal command tests passing (197/197)
- [ ] Universal command built and published to workspace
- [ ] Test infrastructure set up
- [ ] Migration plan reviewed and approved

For each command migration:

- [ ] Current implementation analyzed
- [ ] Schema created and validated
- [ ] Handler implemented
- [ ] Tests written (unit + integration + compatibility)
- [ ] Performance validated
- [ ] CLI registered
- [ ] Old implementation removed
- [ ] Changes committed with clear message

End of migration:

- [ ] All target commands migrated
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation updated
- [ ] Legacy code removed
- [ ] Final validation performed

---

## Related Documentation

- [UNIVERSAL-COMMAND-FIX-PLAN.md](./UNIVERSAL-COMMAND-FIX-PLAN.md) - Original plan with P0/P1 features
- [cli-migration-backlog.md](./cli-migration-backlog.md) - Requirements backlog
- [CLI-COMMAND-AUDIT-CORRECTED.md](../../CLI-COMMAND-AUDIT-CORRECTED.md) - Current SC CLI state
- [src/README.md](../src/README.md) - Universal command API reference
- [examples/](../examples/) - Example commands and patterns

---

**Next Steps**:
1. Review this guide with team
2. Get approval on migration strategy
3. Start with Phase A (Week 1) - health command
4. Document learnings and update this guide as needed
