# Universal Command Fix Plan

**Generated**: 2026-01-16
**Purpose**: Fix universal-command P0 blockers to enable SC CLI migration
**Goal**: Make universal-command truly universal - zero compromises on CLI functionality

---

## Executive Summary

**Current State**: Universal-command has excellent schema/validation foundation but is **not ready** for production CLI migration.

**Blockers**: 6 P0 issues prevent SC CLI migration (see [cli-migration-backlog.md](./cli-migration-backlog.md))

**Ecosystem Research**: Existing tools (Commander.js, Oclif, Gluegun) solve these problems - we should **leverage, not reinvent**.

**Timeline**: ~2-3 weeks to fix P0 + P1, then ready for phased migration.

---

## Part 1: Current State Analysis

### ✅ What Works Well

1. **Schema System** - Clean `CommandSchema` with validation
2. **Multi-Interface** - toMCP(), toNextAPI(), toCLI() pattern is elegant
3. **Validation** - Robust parameter validation with types/enum/patterns
4. **Test Coverage** - Good basics (UniversalCommand.test.ts, CommandRegistry.test.ts)
5. **Scope Registry** - O(1) keyed lookup, progressive loading (advanced feature)

### ❌ What's Broken (P0 Blockers)

From [cli-migration-backlog.md](./cli-migration-backlog.md):

1. **Subcommand Trees** - `health context` becomes `health <context>` (wrong!)
2. **Positional Args** - Only supports `--flags`, no `sc git commit <files...>`
3. **Lazy Loading** - Eagerly loads all commands (8x slowdown, see research)
4. **Streaming Output** - No support for streaming to stdout
5. **CLI Interactivity** - No stdin/TTY (can't prompt user)
6. **Pass-through Flags** - Can't pass `--unknown` to subprocess

---

## Part 2: Ecosystem Research

### Commander.js (Current Dependency)

**What we're using**: v12.0.0 (peer dependency)

**Features we're NOT using**:
- ✅ **Nested subcommands** - `.command()` with stand-alone executables [1]
- ✅ **Positional arguments** - `.argument('<name>')`, `.argument('[name...]')` [2]
- ✅ **Action handlers** - Defer loading to action, not registration [3]
- ✅ **Pass-through options** - `.allowUnknownOption()`, `.passThroughOptions()` [4]

**Sources**:
- [Deeply nested subcommands in Node CLIs with Commander.js – Max Schmitt](https://maxschmitt.me/posts/nested-subcommands-commander-node-js)
- [The Definitive Guide to Commander.js | Better Stack Community](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/)
- [GitHub - tj/commander.js](https://github.com/tj/commander.js)

### Lazy Loading Patterns

**Research findings**:
- **8x performance increase** by lazy-loading modules [5]
- **Load time**: 7-8s → <1s with lazy loading [6]
- **Pattern**: Require in action handler, not at top level [7]

**Approaches**:
1. **Delayed require** - `action: async () => { const mod = require('./handler'); }` [8]
2. **ES6 Proxy** - Defer loading until property access [9]
3. **Lazy-modules package** - Bulk lazy-load (6ms vs 787ms) [10]

**Sources**:
- [Lazy loading your node modules - Josh Bavari's Thoughts](http://jbavari.github.io/blog/2015/08/25/lazy-loading-your-node-modules/)
- [Lazy-Loading Node Modules with Commander | Alex Ramsdell](https://alexramsdell.com/writing/lazy-loading-node-modules-with-commander/)
- [GitHub - brendanashworth/lazy-modules](https://github.com/brendanashworth/lazy-modules)

### Other CLI Frameworks

**Oclif** - Battle-tested (Heroku, Salesforce)
- ✅ Lazy loading built-in
- ✅ Plugin architecture
- ✅ Auto-documentation
- ❌ Opinionated (too heavy for our needs)

**Gluegun** - Lightweight framework
- ✅ Simple API
- ✅ Plugin support
- ✅ Boilerplate generation
- ❌ Less mature than Commander

**Recommendation**: Stick with Commander.js (we're already using it) but USE IT PROPERLY.

**Sources**:
- [Building CLI Applications Made Easy with These NodeJS Frameworks](https://ibrahim-haouari.medium.com/building-cli-applications-made-easy-with-these-nodejs-frameworks-2c06d1ff7a51)
- [Top 12 libraries to build CLI tools in Node.js](https://byby.dev/node-command-line-libraries)

---

## Part 3: P0 Fix Design

### P0-1: Subcommand Trees

**Problem**:
```typescript
// Current (WRONG)
schema.name = "health context"
→ cmd = new Command("health context")  // Creates "health" with required arg "context"

// Expected (CORRECT)
schema.name = "health context"
→ cmd.command("health").command("context")  // Creates nested subcommand
```

**Solution**:
```typescript
interface CommandSchema {
  name: string;  // Keep for backward compat
  cli?: {
    path?: string[];  // NEW: Explicit path for nesting
    // If path is ["health", "context"], create nested structure
  }
}

// In toCLI():
function buildCommandTree(schema: CommandSchema): Command {
  const path = schema.cli?.path || schema.name.split(' ');

  if (path.length === 1) {
    // Leaf command
    return new Command(path[0]);
  }

  // Build nested structure
  let current = new Command(path[0]);
  for (let i = 1; i < path.length; i++) {
    const sub = new Command(path[i]);
    current.addCommand(sub);
    current = sub;
  }
  return current;
}
```

**Test cases**:
- `["git"]` → Single command
- `["git", "commit"]` → `git commit` subcommand
- `["git", "worktree", "merge"]` → `git worktree merge` nested

**Backward compat**: If `cli.path` is undefined, fall back to `name.split(' ')`.

---

### P0-2: Positional Arguments

**Problem**:
```typescript
// Current (WRONG)
sc git commit <files...>  // Can't do this

// Only supports:
sc git commit --files file1.ts --files file2.ts  // Clunky
```

**Solution**:
```typescript
interface Parameter {
  // Existing...
  name: string;
  type: string;
  required?: boolean;

  // NEW: Positional support
  positional?: boolean;  // Is this a positional arg?
  variadic?: boolean;    // Can accept multiple values (like <files...>)
  position?: number;     // Order (0 = first, 1 = second, etc.)
}

// Example:
input: {
  parameters: [
    {
      name: 'files',
      type: 'array',
      positional: true,
      variadic: true,
      position: 0,
      description: 'Files to commit'
    },
    {
      name: 'message',
      type: 'string',
      required: true,
      description: 'Commit message'
    }
  ]
}

// In toCLI():
for (const param of schema.input.parameters) {
  if (param.positional) {
    const argSyntax = param.variadic
      ? `<${param.name}...>`
      : param.required ? `<${param.name}>` : `[${param.name}]`;

    cmd.argument(argSyntax, param.description);
  } else {
    // Existing flag logic
    const flags = param.required
      ? `--${param.name} <${param.name}>`
      : `--${param.name} [${param.name}]`;

    if (param.required) {
      cmd.requiredOption(flags, param.description);
    } else {
      cmd.option(flags, param.description, param.default);
    }
  }
}
```

**Test cases**:
- `<file>` - Single required positional
- `[file]` - Optional positional
- `<files...>` - Variadic required
- `[files...]` - Variadic optional
- Mixed: `<file> [options...]`

**Backward compat**: If `positional` is undefined, default to `false` (flag).

---

### P0-3: Lazy Handler Loading

**Problem**:
```typescript
// Current (WRONG - loads everything eagerly)
class CommandRegistry {
  register(command: UniversalCommand) {
    this.commands.set(command.schema.name, command);
    // command.schema.handler is already loaded!
  }
}
```

**Solution 1: Lazy Command Wrapper**
```typescript
interface LazyCommandSchema<TInput, TOutput> {
  name: string;
  description: string;
  // ... other metadata ...

  // Instead of handler, provide loader
  loader: () => Promise<{
    handler: (args: TInput, context: ExecutionContext) => Promise<TOutput>;
  }>;
}

class LazyUniversalCommand<TInput, TOutput> {
  private handlerCache?: (args: TInput, context: ExecutionContext) => Promise<TOutput>;

  constructor(public readonly schema: LazyCommandSchema<TInput, TOutput>) {}

  async execute(args: TInput, context: ExecutionContext): Promise<TOutput> {
    // Load handler on first execution
    if (!this.handlerCache) {
      const module = await this.schema.loader();
      this.handlerCache = module.handler;
    }

    // Validate and execute
    const validation = this.validateArgs(args);
    if (!validation.valid) {
      throw new ValidationError('Invalid arguments', validation.errors || []);
    }

    return await this.handlerCache(validation.data as TInput, context);
  }
}

// Usage:
registry.register(new LazyUniversalCommand({
  name: 'git commit',
  description: 'Commit changes',
  loader: async () => {
    // Only loads when executed
    const { handleCommit } = await import('./git/commit');
    return { handler: handleCommit };
  }
}));
```

**Solution 2: Registry-Level Lazy Loading**
```typescript
class CommandRegistry {
  private loaders = new Map<string, () => Promise<UniversalCommand>>();
  private commands = new Map<string, UniversalCommand>();

  registerLazy(name: string, loader: () => Promise<UniversalCommand>) {
    this.loaders.set(name, loader);
  }

  async get(name: string): Promise<UniversalCommand | undefined> {
    // Check cache first
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // Load on demand
    const loader = this.loaders.get(name);
    if (loader) {
      const command = await loader();
      this.commands.set(name, command);
      return command;
    }

    return undefined;
  }
}
```

**Recommendation**: Solution 1 (LazyUniversalCommand) - cleaner API, easier to test.

**Test cases**:
- Handler not loaded until execute() called
- Handler cached after first load
- Multiple executions don't reload
- Lazy metadata available (name, description) without loading handler

---

### P0-4: Streaming Output

**Problem**:
```typescript
// Current: Only returns result at end
async handler(args, context) {
  const data = await fetchLargeData();
  return data;  // Waits for everything, then returns
}

// Needed: Stream output as it arrives
async handler(args, context) {
  for await (const chunk of fetchLargeData()) {
    context.stdout.write(chunk);  // Stream to stdout
  }
}
```

**Solution**:
```typescript
interface ExecutionContext {
  interface: 'cli' | 'api' | 'mcp' | 'test';
  projectRoot?: string;

  // CLI-specific: Output streams
  stdout?: NodeJS.WriteStream | NodeJS.WritableStream;
  stderr?: NodeJS.WriteStream | NodeJS.WritableStream;

  // NEW: Streaming support
  stream?: {
    write: (chunk: string | Buffer) => void;
    end: () => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
  };
}

// In toCLI():
cmd.action(async (options: any) => {
  try {
    const context: ExecutionContext = {
      interface: 'cli',
      stdout: process.stdout,
      stderr: process.stderr,
      stream: {
        write: (chunk) => process.stdout.write(chunk),
        end: () => {},  // No-op for CLI
        on: (event, cb) => process.stdout.on(event, cb)
      }
    };

    const result = await this.execute(options, context);

    // If handler used streaming, result might be undefined
    if (result !== undefined) {
      if (this.schema.cli?.format) {
        console.log(this.schema.cli.format(result));
      } else if (this.schema.output.type === 'json') {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result);
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(error.details?.status || 1);
  }
});
```

**Test cases**:
- Stream large data without OOM
- Backpressure handling
- Stream + final result (hybrid)
- Stream to API response (chunked transfer)

---

### P0-5: CLI Interactivity (stdin/TTY)

**Problem**:
```typescript
// Needed for prompts:
const answer = await prompt('Continue? (y/n): ');
if (answer !== 'y') return;

// Needed for piped input:
const data = await readStdin();
```

**Solution**:
```typescript
interface ExecutionContext {
  // ... existing ...

  // NEW: Input support
  stdin?: NodeJS.ReadStream;
  isTTY?: boolean;

  // Helper for prompts
  prompt?: (question: string) => Promise<string>;
}

// In toCLI():
cmd.action(async (options: any) => {
  const context: ExecutionContext = {
    interface: 'cli',
    stdout: process.stdout,
    stderr: process.stderr,
    stdin: process.stdin,
    isTTY: process.stdout.isTTY,

    // Simple prompt helper (can be replaced with better lib)
    prompt: async (question: string) => {
      return new Promise((resolve) => {
        process.stdout.write(question);
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim());
        });
      });
    }
  };

  const result = await this.execute(options, context);
  // ... rest of action ...
});
```

**Alternative**: Use existing prompt library (inquirer, prompts, etc.) and pass adapter:
```typescript
import prompts from 'prompts';

context.prompt = async (question) => {
  const { value } = await prompts({
    type: 'text',
    name: 'value',
    message: question
  });
  return value;
};
```

**Test cases**:
- Detect TTY vs piped
- Read from stdin (piped input)
- Interactive prompts
- Non-TTY mode (CI/automation)

---

### P0-6: Pass-through Flags

**Problem**:
```typescript
// Needed for:
sc build --no-smoke-tests --no-colors --quiet  // Pass unknown to BUILDME.sh
sc test -- --verbose --bail  // Pass to npm test

// Current: Commander rejects unknown flags
```

**Solution**:
```typescript
interface CLIOptions {
  format?: (result: any) => string;
  streaming?: boolean;
  progress?: boolean;
  aliases?: string[];

  // NEW: Pass-through support
  allowUnknownOption?: boolean;
  passThroughOptions?: boolean;
}

// In toCLI():
const cmd = new Command(this.schema.name);
cmd.description(this.schema.description);

// Enable pass-through if specified
if (this.schema.cli?.allowUnknownOption) {
  cmd.allowUnknownOption();
}

if (this.schema.cli?.passThroughOptions) {
  cmd.passThroughOptions();
}

// In action handler, unknown options available:
cmd.action(async (options: any, command: Command) => {
  const knownArgs = options;
  const unknownArgs = command.args;  // Everything after --

  // Pass to handler
  const result = await this.execute(
    { ...knownArgs, _unknown: unknownArgs },
    context
  );
});
```

**Test cases**:
- `--unknown-flag` allowed when enabled
- `-- extra args` captured
- Unknown flags passed to subprocess
- Error when not enabled

---

## Part 4: P1 Features (High Priority)

### P1-7: Exit Code Mapping

**Current**: Opaque errors, always exit(1)

**Solution**:
```typescript
export class CommandError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public details?: any
  ) {
    super(message);
    this.name = 'CommandError';
  }
}

// In toCLI():
cmd.action(async (options: any) => {
  try {
    const result = await this.execute(options, context);
    // ... output ...
  } catch (error: any) {
    if (error instanceof CommandError) {
      console.error('Error:', error.message);
      process.exit(error.exitCode);
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
});
```

---

### P1-8: Global Options & Hooks

**Needed**: `--yes-to-rules`, telemetry, pre/post hooks

**Solution**:
```typescript
interface ProgramOptions {
  globalOptions?: Parameter[];
  hooks?: {
    preCommand?: (command: string, args: any) => void | Promise<void>;
    postCommand?: (command: string, result: any) => void | Promise<void>;
    onError?: (command: string, error: Error) => void | Promise<void>;
  };
}

export function createCLIProgram(
  registry: CommandRegistry,
  options?: ProgramOptions
): Command {
  const program = new Command();

  // Add global options
  if (options?.globalOptions) {
    for (const opt of options.globalOptions) {
      program.option(`--${opt.name}`, opt.description, opt.default);
    }
  }

  // Register commands
  for (const command of registry.getAll()) {
    const cmd = command.toCLI();

    // Wrap action with hooks
    const originalAction = cmd._actionHandler;
    cmd.action(async (...args: any[]) => {
      try {
        await options?.hooks?.preCommand?.(command.schema.name, args);
        const result = await originalAction(...args);
        await options?.hooks?.postCommand?.(command.schema.name, result);
        return result;
      } catch (error: any) {
        await options?.hooks?.onError?.(command.schema.name, error);
        throw error;
      }
    });

    program.addCommand(cmd);
  }

  return program;
}
```

---

### P1-9: Fast Help Generation

**Problem**: `sc --help` loads all commands (slow)

**Solution**: Lazy metadata without loading handlers
```typescript
interface CommandMetadata {
  name: string;
  description: string;
  category?: string;
  scope?: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;
}

class LazyUniversalCommand {
  // Metadata available without loading handler
  getMetadata(): CommandMetadata {
    return {
      name: this.schema.name,
      description: this.schema.description,
      category: this.schema.category,
      scope: this.schema.scope,
      parameters: this.schema.input.parameters.map(p => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required || false
      }))
    };
  }
}

// Help generation uses metadata only
function generateHelp(registry: CommandRegistry): string {
  const commands = registry.getAll();
  const lines: string[] = [];

  for (const cmd of commands) {
    const meta = cmd.getMetadata?.() || {
      name: cmd.schema.name,
      description: cmd.schema.description
    };
    lines.push(`  ${meta.name.padEnd(30)} ${meta.description}`);
  }

  return lines.join('\n');
}
```

---

### P1-10: Output Formatting Helpers

**Needed**: Tables, progress bars, colors

**Solution**: Provide formatters in context
```typescript
interface ExecutionContext {
  // ... existing ...

  format?: {
    table: (data: any[], columns?: string[]) => string;
    progress: (current: number, total: number) => void;
    success: (message: string) => string;
    error: (message: string) => string;
    warning: (message: string) => string;
  };
}

// Use existing libraries
import chalk from 'chalk';
import Table from 'cli-table3';

context.format = {
  table: (data, columns) => {
    const table = new Table({ head: columns || Object.keys(data[0] || {}) });
    for (const row of data) {
      table.push(Object.values(row));
    }
    return table.toString();
  },
  progress: (current, total) => {
    const pct = Math.round((current / total) * 100);
    process.stdout.write(`\rProgress: ${pct}%`);
  },
  success: (msg) => chalk.green(`✓ ${msg}`),
  error: (msg) => chalk.red(`✗ ${msg}`),
  warning: (msg) => chalk.yellow(`⚠ ${msg}`)
};
```

---

### P1-11: Documentation & Test Generation

**Problem**: Currently only generates CLI/API/MCP code, but NOT documentation or tests.

**Current generators**:
- ✅ `next-routes.ts` - Next.js API routes
- ✅ `mcp-server.ts` - MCP tool definitions
- ✅ `openapi.ts` - OpenAPI 3.0 specs
- ❌ **No docs generator**
- ❌ **No test generator**

**Solution 1: Documentation Generator**

```typescript
// packages/universal-command/src/generators/plugins/docs-generator.ts
import { FileGenerator } from '../types';
import type { UniversalCommand } from '../../UniversalCommand';

export interface DocsOptions extends FileGeneratorOptions {
  /** Documentation format */
  format?: 'markdown' | 'html' | 'json';
  /** Include examples */
  includeExamples?: boolean;
  /** Include parameter table */
  includeParameterTable?: boolean;
}

export class DocsGenerator extends FileGenerator<DocsOptions> {
  readonly name = 'docs-markdown';
  readonly description = 'Generate markdown documentation from command schemas';
  readonly outputExtensions = ['.md'];

  generateContent(command: UniversalCommand, options: DocsOptions): string {
    const { schema } = command;
    const sections: string[] = [];

    // Header
    sections.push(`# ${schema.name}`);
    sections.push('');
    sections.push(schema.description);
    sections.push('');

    // Parameters section
    if (schema.input.parameters.length > 0) {
      sections.push('## Parameters');
      sections.push('');

      if (options.includeParameterTable) {
        // Table format
        sections.push('| Name | Type | Required | Description |');
        sections.push('|------|------|----------|-------------|');
        for (const p of schema.input.parameters) {
          sections.push(
            `| \`${p.name}\` | ${p.type} | ${p.required ? '✓' : ''} | ${p.description} |`
          );
        }
      } else {
        // List format
        for (const p of schema.input.parameters) {
          const required = p.required ? ' **(required)**' : '';
          const defaultVal = p.default !== undefined ? ` (default: \`${p.default}\`)` : '';
          const enumVals = p.enum ? ` (options: ${p.enum.map(v => `\`${v}\``).join(', ')})` : '';
          sections.push(`- \`${p.name}\` (${p.type}${required}): ${p.description}${defaultVal}${enumVals}`);
        }
      }
      sections.push('');
    }

    // Examples section
    if (options.includeExamples) {
      sections.push('## Examples');
      sections.push('');

      // CLI example
      sections.push('### CLI');
      sections.push('```bash');
      const cliExample = this.generateCLIExample(command);
      sections.push(cliExample);
      sections.push('```');
      sections.push('');

      // API example
      sections.push('### API');
      sections.push('```bash');
      const apiExample = this.generateAPIExample(command);
      sections.push(apiExample);
      sections.push('```');
      sections.push('');

      // MCP example
      sections.push('### MCP');
      sections.push('```json');
      const mcpExample = this.generateMCPExample(command);
      sections.push(mcpExample);
      sections.push('```');
      sections.push('');
    }

    // Output section
    if (schema.output.type) {
      sections.push('## Output');
      sections.push('');
      sections.push(`Type: \`${schema.output.type}\``);
      if (schema.output.description) {
        sections.push('');
        sections.push(schema.output.description);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  getOutputPath(command: UniversalCommand, options: DocsOptions): string {
    const path = require('path');
    const fileName = command.schema.name.replace(/ /g, '-') + '.md';
    return path.join(options.outputDir, fileName);
  }

  private generateCLIExample(command: UniversalCommand): string {
    const parts = [`sc ${command.schema.name}`];

    // Add required params
    const required = command.schema.input.parameters.filter(p => p.required);
    for (const p of required) {
      const example = this.getExampleValue(p);
      parts.push(`--${p.name} ${example}`);
    }

    return parts.join(' ');
  }

  private generateAPIExample(command: UniversalCommand): string {
    const path = command.getAPIRoutePath().replace(/ /g, '/');
    const params = command.schema.input.parameters
      .filter(p => p.required)
      .map(p => `${p.name}=${this.getExampleValue(p)}`)
      .join('&');

    const method = command.schema.api?.method || 'GET';
    return `curl -X ${method} "http://localhost:3000/api/${path}?${params}"`;
  }

  private generateMCPExample(command: UniversalCommand): string {
    const toolName = command.getMCPToolName();
    const args: Record<string, any> = {};

    for (const p of command.schema.input.parameters.filter(p => p.required)) {
      args[p.name] = this.getExampleValue(p);
    }

    return JSON.stringify(
      {
        tool: toolName,
        arguments: args
      },
      null,
      2
    );
  }

  private getExampleValue(param: any): string {
    if (param.default !== undefined) return String(param.default);
    if (param.enum) return param.enum[0];

    switch (param.type) {
      case 'string':
        return 'example';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'array':
        return '["item1", "item2"]';
      default:
        return 'value';
    }
  }
}
```

**Solution 2: Test Generator**

```typescript
// packages/universal-command/src/generators/plugins/test-generator.ts
import { FileGenerator } from '../types';
import type { UniversalCommand } from '../../UniversalCommand';

export interface TestOptions extends FileGeneratorOptions {
  /** Test framework */
  framework?: 'vitest' | 'jest' | 'mocha';
  /** Include integration tests */
  includeIntegration?: boolean;
  /** Include validation tests */
  includeValidation?: boolean;
}

export class TestGenerator extends FileGenerator<TestOptions> {
  readonly name = 'test-scaffold';
  readonly description = 'Generate test scaffolding from command schemas';
  readonly outputExtensions = ['.test.ts', '.spec.ts'];

  generateContent(command: UniversalCommand, options: TestOptions): string {
    const framework = options.framework || 'vitest';
    const sections: string[] = [];

    // Imports
    sections.push(this.generateImports(framework, command));
    sections.push('');

    // Test suite
    sections.push(`describe('${command.schema.name}', () => {`);

    // Unit tests
    sections.push(this.generateUnitTests(command, framework));

    // Validation tests
    if (options.includeValidation) {
      sections.push(this.generateValidationTests(command, framework));
    }

    // Integration tests
    if (options.includeIntegration) {
      sections.push(this.generateIntegrationTests(command, framework));
    }

    sections.push('});');

    return sections.join('\n');
  }

  getOutputPath(command: UniversalCommand, options: TestOptions): string {
    const path = require('path');
    const fileName = command.schema.name.replace(/ /g, '-') + '.test.ts';
    return path.join(options.outputDir, fileName);
  }

  private generateImports(framework: string, command: UniversalCommand): string {
    const imports: string[] = [];

    // Test framework imports
    switch (framework) {
      case 'vitest':
        imports.push(`import { describe, it, expect, beforeEach } from 'vitest';`);
        break;
      case 'jest':
        imports.push(`import { describe, it, expect, beforeEach } from '@jest/globals';`);
        break;
      case 'mocha':
        imports.push(`import { describe, it } from 'mocha';`);
        imports.push(`import { expect } from 'chai';`);
        break;
    }

    // Command import
    const commandName = this.toPascalCase(command.schema.name);
    imports.push(`import { ${commandName} } from './${command.schema.name.replace(/ /g, '-')}';`);

    return imports.join('\n');
  }

  private generateUnitTests(command: UniversalCommand, framework: string): string {
    const sections: string[] = [];

    sections.push('  describe("Unit Tests", () => {');
    sections.push('    it("should execute with valid parameters", async () => {');
    sections.push('      const result = await command.execute({');

    // Add required parameters
    const required = command.schema.input.parameters.filter(p => p.required);
    for (const p of required) {
      const value = this.getTestValue(p);
      sections.push(`        ${p.name}: ${value},`);
    }

    sections.push('      }, { interface: "cli" });');
    sections.push('');
    sections.push('      expect(result).toBeDefined();');
    sections.push('    });');
    sections.push('  });');
    sections.push('');

    return sections.join('\n');
  }

  private generateValidationTests(command: UniversalCommand, framework: string): string {
    const sections: string[] = [];

    sections.push('  describe("Validation Tests", () => {');

    // Test missing required params
    const required = command.schema.input.parameters.filter(p => p.required);
    if (required.length > 0) {
      sections.push('    it("should reject missing required parameters", async () => {');
      sections.push('      await expect(');
      sections.push('        command.execute({}, { interface: "cli" })');
      sections.push('      ).rejects.toThrow();');
      sections.push('    });');
      sections.push('');
    }

    // Test enum validation
    const enumParams = command.schema.input.parameters.filter(p => p.enum);
    for (const p of enumParams) {
      sections.push(`    it("should reject invalid enum value for ${p.name}", async () => {`);
      sections.push('      await expect(');
      sections.push('        command.execute({');
      sections.push(`          ${p.name}: "invalid-value"`);
      sections.push('        }, { interface: "cli" })');
      sections.push('      ).rejects.toThrow();');
      sections.push('    });');
      sections.push('');
    }

    sections.push('  });');
    sections.push('');

    return sections.join('\n');
  }

  private generateIntegrationTests(command: UniversalCommand, framework: string): string {
    const sections: string[] = [];

    sections.push('  describe("Integration Tests", () => {');
    sections.push('    it("should work via CLI interface", async () => {');
    sections.push('      // TODO: Test CLI execution');
    sections.push('    });');
    sections.push('');
    sections.push('    it("should work via API interface", async () => {');
    sections.push('      // TODO: Test API route');
    sections.push('    });');
    sections.push('');
    sections.push('    it("should work via MCP interface", async () => {');
    sections.push('      // TODO: Test MCP tool');
    sections.push('    });');
    sections.push('  });');

    return sections.join('\n');
  }

  private getTestValue(param: any): string {
    if (param.default !== undefined) return JSON.stringify(param.default);
    if (param.enum) return JSON.stringify(param.enum[0]);

    switch (param.type) {
      case 'string':
        return '"test-value"';
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'array':
        return '["item1", "item2"]';
      default:
        return '{}';
    }
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[\s-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
```

**Usage**:

```typescript
import { generatorRegistry, DocsGenerator, TestGenerator } from '@supernal/universal-command';

// Register generators
generatorRegistry.register(new DocsGenerator());
generatorRegistry.register(new TestGenerator());

// Generate docs
await generate('docs-markdown', registry, {
  outputDir: 'docs/commands',
  includeExamples: true,
  includeParameterTable: true
});

// Generate tests
await generate('test-scaffold', registry, {
  outputDir: 'tests/commands',
  framework: 'vitest',
  includeValidation: true,
  includeIntegration: true
});
```

**Test cases**:
- [ ] Generate markdown docs with parameter tables
- [ ] Generate CLI/API/MCP examples in docs
- [ ] Generate Vitest test scaffolding
- [ ] Generate validation tests for required params
- [ ] Generate validation tests for enum constraints
- [ ] Generate integration test stubs

---

## Part 5: Implementation Plan

### Phase 1: P0 Fixes (Week 1)

**Day 1-2: Subcommand Trees + Positional Args**
- [ ] Add `cli.path` to CommandSchema
- [ ] Implement `buildCommandTree()` in UniversalCommand.toCLI()
- [ ] Add `positional`, `variadic`, `position` to Parameter
- [ ] Update toCLI() to handle `.argument()` vs `.option()`
- [ ] Write tests for nested commands
- [ ] Write tests for positional args (single, optional, variadic, mixed)

**Day 3-4: Lazy Loading**
- [ ] Create LazyUniversalCommand class
- [ ] Implement loader pattern
- [ ] Update CommandRegistry to support lazy registration
- [ ] Write tests for lazy loading (handler not loaded until execute)
- [ ] Benchmark: Compare startup time (lazy vs eager)

**Day 5: Streaming + TTY + Pass-through**
- [ ] Add `stream`, `stdin`, `isTTY`, `prompt` to ExecutionContext
- [ ] Update toCLI() action handler to provide streaming context
- [ ] Add `allowUnknownOption`, `passThroughOptions` to CLIOptions
- [ ] Wire up pass-through flags in toCLI()
- [ ] Write tests for streaming, prompts, pass-through

### Phase 2: P1 Features (Week 2)

**Day 1: Exit Codes + Error Handling**
- [ ] Create CommandError class
- [ ] Update toCLI() to handle CommandError.exitCode
- [ ] Write tests for exit code mapping

**Day 2: Global Options + Hooks**
- [ ] Create createCLIProgram() function
- [ ] Add ProgramOptions with globalOptions and hooks
- [ ] Wire up hooks around command actions
- [ ] Write tests for global options, pre/post hooks

**Day 3: Fast Help + Output Formatting**
- [ ] Add getMetadata() to LazyUniversalCommand
- [ ] Implement help generation from metadata only
- [ ] Add format helpers to ExecutionContext
- [ ] Write tests for help performance, formatters

**Day 4: Documentation & Test Generation**
- [ ] Create DocsGenerator plugin (markdown from schemas)
- [ ] Implement CLI/API/MCP example generation in docs
- [ ] Create TestGenerator plugin (Vitest scaffolding)
- [ ] Add validation and integration test generation
- [ ] Register both generators in generator registry
- [ ] Write tests for doc generation (parameter tables, examples)
- [ ] Write tests for test scaffolding (unit, validation, integration stubs)

**Day 5: Integration Testing**
- [ ] Create full CLI example (nested commands, positional args, lazy loading)
- [ ] Benchmark full startup time
- [ ] Test all features together
- [ ] Document breaking changes

### Phase 3: Performance & Polish (Week 3)

**Day 1-2: Optimization**
- [ ] Profile lazy loading performance
- [ ] Optimize schema validation (cache compiled validators)
- [ ] Minimize dependencies (tree-shake unused code)
- [ ] Benchmark against Oclif/Gluegun

**Day 3-4: Documentation**
- [ ] Update README with all new features
- [ ] Create migration guide (v0.1 → v1.0)
- [ ] Document breaking changes
- [ ] Add examples for each P0/P1 feature

**Day 5: Release Prep**
- [ ] Bump version to 1.0.0
- [ ] Update CHANGELOG
- [ ] Publish to npm
- [ ] Create GitHub release

---

## Part 6: Migration Strategy

Once universal-command is fixed:

### Phase A: Read-Only Commands (Week 4)
- `sc health` (all subcommands)
- `sc rules export`
- `sc traceability`
- `sc search`

**Approach**: Migrate one-by-one, validate functionality, commit.

### Phase B: Non-Interactive Commands (Week 5)
- `sc docs`
- `sc audit`
- `sc validation`
- `sc build` (non-interactive flags)

### Phase C: Interactive/Complex Commands (Week 6+)
- `sc init` (prompts)
- `sc git` (28 files → consolidated in universal-command)
- `sc planning` (38 files → consolidated)
- `sc workflow`

**Benefit**: Migration FORCES consolidation (git 28 → ~10 commands, planning 38 → ~15 commands)

---

## Part 7: Breaking Changes

### From v0.1 to v1.0

**Breaking**:
1. `schema.name` with spaces now creates nested commands (use `cli.path` to override)
2. Handler signature unchanged, but lazy loading requires `loader` pattern for new commands
3. ExecutionContext gains new properties (backward compatible - all optional)

**Migration**:
```typescript
// Before (v0.1)
new UniversalCommand({
  name: 'health context',  // Creates "health" with arg "context" (BUG)
  handler: async (args, ctx) => { ... }
});

// After (v1.0) - Option 1: Explicit path
new UniversalCommand({
  name: 'health context',
  cli: { path: ['health', 'context'] },  // Creates nested subcommand
  handler: async (args, ctx) => { ... }
});

// After (v1.0) - Option 2: Lazy loading (recommended)
new LazyUniversalCommand({
  name: 'health context',
  cli: { path: ['health', 'context'] },
  loader: async () => {
    const { handler } = await import('./health/context');
    return { handler };
  }
});
```

---

## Part 8: Success Criteria

### Functional Requirements (P0)

- [ ] Subcommand trees work (`sc git worktree merge`)
- [ ] Positional args work (`sc git commit <files...>`)
- [ ] Lazy loading (8x faster startup)
- [ ] Streaming output (no OOM on large data)
- [ ] CLI interactivity (prompts, stdin)
- [ ] Pass-through flags (`-- --unknown`)

### Functional Requirements (P1)

- [ ] Exit code mapping works
- [ ] Global options work (`--yes-to-rules`)
- [ ] Pre/post command hooks work
- [ ] Fast help generation (metadata only)
- [ ] Output formatting helpers (tables, progress, colors)
- [ ] Documentation generation (markdown from schemas)
- [ ] Test generation (Vitest scaffolding from schemas)

### Performance Requirements

- [ ] Startup time < 100ms (lazy loading)
- [ ] Help generation < 50ms (metadata only, no handler loading)
- [ ] Memory usage < 50MB base (without loading handlers)

### Quality Requirements

- [ ] Test coverage > 90%
- [ ] All P0 features tested
- [ ] All P1 features tested
- [ ] Migration guide complete

---

## References

### Ecosystem Research

**Commander.js**:
- [Deeply nested subcommands in Node CLIs with Commander.js – Max Schmitt](https://maxschmitt.me/posts/nested-subcommands-commander-node-js)
- [The Definitive Guide to Commander.js | Better Stack Community](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/)
- [GitHub - tj/commander.js](https://github.com/tj/commander.js)

**Lazy Loading**:
- [Lazy loading your node modules - Josh Bavari's Thoughts](http://jbavari.github.io/blog/2015/08/25/lazy-loading-your-node-modules/)
- [Lazy-Loading Node Modules with Commander | Alex Ramsdell](https://alexramsdell.com/writing/lazy-loading-node-modules-with-commander/)
- [GitHub - brendanashworth/lazy-modules](https://github.com/brendanashworth/lazy-modules)

**CLI Frameworks**:
- [Building CLI Applications Made Easy with These NodeJS Frameworks](https://ibrahim-haouari.medium.com/building-cli-applications-made-easy-with-these-nodejs-frameworks-2c06d1ff7a51)
- [Top 12 libraries to build CLI tools in Node.js](https://byby.dev/node-command-line-libraries)

### Internal Docs

- [cli-migration-backlog.md](./cli-migration-backlog.md) - P0/P1 requirements
- [CLI-COMMAND-AUDIT-CORRECTED.md](../../CLI-COMMAND-AUDIT-CORRECTED.md) - Current SC CLI state

---

**Next Steps**:
1. Get approval on this plan
2. Start Phase 1 (P0 fixes)
3. Weekly demos of progress
4. Release universal-command v1.0
5. Begin SC CLI migration (Phase A)