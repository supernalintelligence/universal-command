<div align="center">

# @supernal/universal-command

[![npm version](https://img.shields.io/npm/v/@supernal/universal-command.svg)](https://www.npmjs.com/package/@supernal/universal-command)
[![npm downloads](https://img.shields.io/npm/dm/@supernal/universal-command.svg)](https://www.npmjs.com/package/@supernal/universal-command)
[![Tests](https://img.shields.io/badge/tests-93%20passing-brightgreen.svg)](https://github.com/supernalintelligence/universal-command/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Define your command once. Deploy it to CLI, API, and MCP automatically.**

[📦 npm](https://www.npmjs.com/package/@supernal/universal-command) ·
[📖 Docs](#api-reference) ·
[🐛 Issues](https://github.com/supernalintelligence/universal-command/issues)

</div>

---

## The Problem

Building tools for the AI age means maintaining **three separate implementations**:

- **CLI** — Commander.js schema + handler + output formatting
- **API** — Next.js/Express schema + handler + auth + caching
- **MCP** — `@modelcontextprotocol/sdk` schema + handler + capabilities

That's 3× the code, 3× the tests, and inevitable drift between interfaces.

**Universal Command** solves this: define your command once, generate all three.

---

## Why Universal Command?

| Feature              | Universal Command          | Manual Implementation     |
| -------------------- | -------------------------- | ------------------------- |
| **Maintenance**      | Define once                | Define 3× (CLI/API/MCP)   |
| **Drift risk**       | None (single source)       | High (separate codebases) |
| **Type safety**      | Full TypeScript            | Varies by interface       |
| **Validation**       | Automatic                  | Manual per interface      |
| **Testing**          | Test handler once          | Test 3×                   |
| **Feature velocity** | Add once, works everywhere | Add 3×                    |

---

## Quick Example

```typescript
import { UniversalCommand } from '@supernal/universal-command';

const userCreate = new UniversalCommand({
  name: 'user create',
  description: 'Create a new user',
  input: {
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'User name' },
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'role', type: 'string', default: 'user', enum: ['user', 'admin'] },
    ],
  },
  handler: async (args) => createUser(args),
});

// CLI  →  mycli user create --name Alice --email alice@example.com
const cli = userCreate.toCLI(); // Commander.Command

// API  →  POST /api/users/create
export const POST = userCreate.toNextAPI(); // Next.js route handler

// MCP  →  Claude / Cursor / Zed tool call
const tool = userCreate.toMCP(); // MCP tool definition
```

**One definition. Three interfaces. Zero drift.**

---

## The MCP Moment

The Model Context Protocol is rapidly becoming the standard way AI agents invoke tools. Claude, Cursor, Zed, and a growing ecosystem already support it. Every developer tool needs an MCP interface — and that number is only going up.

> 🔗 [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — Your tool is one definition away from being listed here.

With Universal Command, adding MCP support to an existing CLI takes **one line**. No separate schema. No duplicate handler. No drift.

---

## Installation

```bash
npm install @supernal/universal-command
```

Install peer dependencies for the interfaces you need:

```bash
npm install commander                    # CLI
npm install next                         # Next.js API
npm install @modelcontextprotocol/sdk    # MCP
```

---

## Core Usage

### Define your command

```typescript
import { UniversalCommand } from '@supernal/universal-command';

export const issueCreate = new UniversalCommand({
  name: 'issue create',
  description: 'Create a GitHub issue',

  input: {
    parameters: [
      { name: 'title', type: 'string', required: true },
      { name: 'body', type: 'string' },
      { name: 'labels', type: 'array', items: { type: 'string' } },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: { id: { type: 'number' }, url: { type: 'string' } },
    },
  },

  handler: async (args) => {
    return await octokit.issues.create({
      owner: 'org',
      repo: 'repo',
      title: args.title,
      body: args.body,
      labels: args.labels,
    });
  },
});
```

### Deploy to CLI

```typescript
// cli.ts
import { Command } from 'commander';
import { issueCreate } from './commands/issue-create';

const program = new Command();
program.addCommand(issueCreate.toCLI());
program.parse();
```

```bash
$ mytool issue create --title "Bug: login fails" --labels bug,urgent
```

### Deploy to Next.js API

```typescript
// app/api/issues/create/route.ts
import { issueCreate } from '@/commands/issue-create';

export const POST = issueCreate.toNextAPI();
```

```bash
$ curl -X POST /api/issues/create \
    -d '{"title":"Bug: login fails","labels":["bug","urgent"]}'
```

### Deploy to MCP

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server';
import { issueCreate } from './commands/issue-create';

const server = new Server({ name: 'my-mcp-server' });

server.setRequestHandler('tools/list', async () => ({
  tools: [issueCreate.toMCP()],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'issue_create') {
    return await issueCreate.executeMCP(request.params.arguments);
  }
});
```

---

## Interface-Specific Overrides

Each interface can be customized without touching the shared handler:

```typescript
new UniversalCommand({
  name: 'data export',
  // ...

  cli: {
    format: (data) => JSON.stringify(data, null, 2),
    streaming: true,
  },

  api: {
    method: 'GET',
    cacheControl: { maxAge: 300, staleWhileRevalidate: 60 },
    auth: { required: true, roles: ['admin'] },
  },

  mcp: {
    resourceLinks: ['export://results'],
    capabilities: ['streaming'],
  },
});
```

---

## Execution Context

The handler receives a `context` object with interface-specific info:

```typescript
handler: async (args, context) => {
  if (context.interface === 'cli') {
    console.log('Running from terminal');
  }

  if (context.interface === 'api') {
    const userId = context.request.headers.get('x-user-id');
  }

  return result;
};
```

---

## Error Handling

Throw a `CommandError` — it's automatically formatted for each interface:

```typescript
import { CommandError } from '@supernal/universal-command';

handler: async (args) => {
  if (!isValid(args.email)) {
    throw new CommandError('Invalid email', { code: 'INVALID_EMAIL', status: 400 });
  }
  return result;
};
```

- **CLI**: Human-readable message + non-zero exit code
- **API**: `{ error: ... }` JSON with HTTP status
- **MCP**: MCP error format

---

## Runtime Server

Register multiple commands and serve them all at once:

```typescript
import { createRuntimeServer } from '@supernal/universal-command';

const server = createRuntimeServer();
server.register(userCreate);
server.register(issueCreate);
```

### Next.js (catch-all route)

```typescript
// app/api/[...path]/route.ts
const server = createServer();
const handlers = server.getNextHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
```

### Express

```typescript
app.use('/api', createServer().getExpressRouter());
```

### MCP Server

```typescript
await createServer().startMCP({
  name: 'my-mcp-server',
  version: '1.0.0',
  transport: 'stdio',
});
```

---

## Registry Pattern

For large projects, group commands in a registry:

```typescript
// commands/index.ts
import { CommandRegistry } from '@supernal/universal-command';

export const registry = new CommandRegistry();
registry.register(userCreate);
registry.register(issueCreate);
```

```typescript
// Generate all CLI commands
for (const cmd of registry.getAll()) {
  program.addCommand(cmd.toCLI());
}
```

```typescript
// Generate all Next.js routes (build-time)
import { generateNextRoutes } from '@supernal/universal-command/codegen';

await generateNextRoutes(registry, { outputDir: 'app/api', typescript: true });
// Outputs: app/api/users/create/route.ts, app/api/issues/create/route.ts, ...
```

---

## Testing

Test the handler once — it works everywhere:

```typescript
import { userCreate } from './commands/user-create';

test('creates user', async () => {
  const result = await userCreate.execute(
    { name: 'Alice', email: 'alice@example.com' },
    { interface: 'test' }
  );
  expect(result.name).toBe('Alice');
});
```

Integration test helpers:

```typescript
import { testCLI, testAPI, testMCP } from '@supernal/universal-command/testing';

test('CLI', async () => {
  const output = await testCLI(userCreate, {
    args: ['--name', 'Alice', '--email', 'alice@example.com'],
  });
  expect(output).toContain('Created user');
});

test('API', async () => {
  const res = await testAPI(userCreate, {
    method: 'POST',
    body: { name: 'Alice', email: 'alice@example.com' },
  });
  expect(res.status).toBe(200);
});

test('MCP', async () => {
  const result = await testMCP(userCreate, {
    arguments: { name: 'Alice', email: 'alice@example.com' },
  });
  expect(result.content[0].text).toContain('Alice');
});
```

---

## API Reference

### `UniversalCommand`

```typescript
class UniversalCommand<TInput, TOutput> {
  constructor(schema: CommandSchema<TInput, TOutput>);

  execute(args: TInput, context: ExecutionContext): Promise<TOutput>;
  executeMCP(args: unknown): Promise<MCPToolResult>;

  toCLI(): Command; // Commander.js
  toNextAPI(): NextAPIRoute; // Next.js App Router
  toExpressAPI(): ExpressRoute;
  toMCP(): MCPToolDefinition;

  validateArgs(args: unknown): ValidationResult<TInput>;
  getAPIRoutePath(): string;
  getMCPToolName(): string;
}
```

### `CommandSchema`

```typescript
interface CommandSchema<TInput, TOutput> {
  name: string;
  description: string;
  category?: string;

  input: {
    parameters: Parameter[];
  };

  output?: {
    type: 'json' | 'text' | 'stream';
    schema?: JSONSchema;
  };

  handler: (args: TInput, context: ExecutionContext) => Promise<TOutput>;

  cli?: CLIOptions;
  api?: APIOptions;
  mcp?: MCPOptions;
}
```

### `Parameter`

```typescript
interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required?: boolean;
  default?: any;

  // Validation
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  items?: Parameter; // for array type
}
```

### `ExecutionContext`

```typescript
interface ExecutionContext {
  interface: 'cli' | 'api' | 'mcp' | 'test';
  projectRoot?: string;
  request?: NextRequest | Request; // API
  stdout?: NodeJS.WriteStream; // CLI
  stderr?: NodeJS.WriteStream; // CLI
}
```

---

## Roadmap

| Version  | Status     | Features                                   |
| -------- | ---------- | ------------------------------------------ |
| **v1.0** | ✅ Current | CLI, Next.js API, MCP, TypeScript          |
| **v1.1** | 🔄 Planned | Express.js, streaming, auto-generated docs |
| **v2.0** | 📋 Future  | Hono, gRPC, GraphQL                        |

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

This project uses [Supernal Coding](https://github.com/supernalintelligence/supernal-coding) for requirement tracking. Pre-commit hooks run lint, type-check, and all 93 tests automatically.

---

## License

MIT — See [LICENSE](LICENSE)

---

<div align="center">

Built by [Supernal Intelligence](https://supernal.ai) · [Commander.js](https://github.com/tj/commander.js) · [Next.js](https://nextjs.org) · [Model Context Protocol](https://modelcontextprotocol.io)

</div>
