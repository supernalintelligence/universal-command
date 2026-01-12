# @supernal/universal-command

**Universal Command Abstraction for CLI, API, and MCP**

Define your command once, deploy it everywhere.

---

## The Problem

Building a command-line tool with API and AI integration requires maintaining three separate implementations:

```typescript
// CLI (Commander.js)
program.command('requirement list')
  .option('--status <status>')
  .action(async (options) => { /* implementation */ });

// API (Next.js)
export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status');
  // duplicate implementation
}

// MCP (Model Context Protocol)
{
  name: 'requirement_list',
  inputSchema: { /* duplicate schema */ },
  handler: async (args) => { /* duplicate implementation */ }
}
```

**Result**: 3x maintenance burden, drift risk, duplicated logic.

---

## The Solution

Define once, deploy everywhere:

```typescript
import { UniversalCommand } from '@supernal/universal-command';

export const requirementList = new UniversalCommand({
  name: 'requirement list',
  description: 'List all requirements',

  input: {
    parameters: [
      {
        name: 'status',
        type: 'string',
        description: 'Filter by status',
        enum: ['draft', 'in-progress', 'done'],
      },
    ],
  },

  // Single handler works everywhere
  handler: async (args, context) => {
    return await fetchRequirements({ status: args.status });
  },

  // Optional: CLI-specific formatting
  cli: {
    format: (results) => results.map((r) => `${r.id}: ${r.title}`).join('\n'),
  },
});
```

**Deploy automatically**:

```typescript
// Generate CLI
const program = requirementList.toCLI();

// Generate Next.js API
export const GET = requirementList.toNextAPI();

// Generate MCP tool
const mcpTool = requirementList.toMCP();
```

---

## Features

### 🎯 **Single Source of Truth**

- Define command logic once
- CLI, API, MCP stay in sync automatically
- No duplication, no drift

### 🚀 **Zero Overhead**

- Thin wrappers around your handler
- No performance penalty
- Direct function calls

### 🔧 **Framework Agnostic**

- Bring your own handler implementation
- Works with any framework
- No vendor lock-in

### 📦 **Interface-Specific Overrides**

- CLI: Custom formatting, progress bars
- API: Caching, rate limiting, auth
- MCP: Resource links, capabilities

### 🛡️ **Type Safe**

- Full TypeScript support
- Input/output validation
- Compile-time error detection

### 🧪 **Testable**

- Test handler once, works everywhere
- Mock context for testing
- Integration test helpers

---

## Installation

```bash
npm install @supernal/universal-command
```

**Peer dependencies**:

```bash
# For CLI generation
npm install commander

# For Next.js API generation
npm install next

# For MCP generation
npm install @modelcontextprotocol/sdk
```

---

## Quick Start

### 1. Define Your Command

```typescript
// commands/user-create.ts
import { UniversalCommand } from '@supernal/universal-command';

export const userCreate = new UniversalCommand({
  name: 'user create',
  description: 'Create a new user',
  category: 'users',

  input: {
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'User name',
        required: true,
      },
      {
        name: 'email',
        type: 'string',
        description: 'User email',
        required: true,
      },
      {
        name: 'role',
        type: 'string',
        description: 'User role',
        default: 'user',
        enum: ['user', 'admin'],
      },
    ],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },

  handler: async (args, context) => {
    // Your implementation
    const user = await createUser({
      name: args.name,
      email: args.email,
      role: args.role,
    });

    return user;
  },
});
```

### 2. Generate CLI

```typescript
// cli.ts
import { Command } from 'commander';
import { userCreate } from './commands/user-create';

const program = new Command();
program.addCommand(userCreate.toCLI());
program.parse();
```

```bash
$ mycli user create --name "Alice" --email "alice@example.com"
Created user: alice@example.com (ID: user-123)
```

### 3. Generate Next.js API

```typescript
// app/api/users/create/route.ts
import { userCreate } from '@/commands/user-create';

export const POST = userCreate.toNextAPI();
```

```bash
$ curl -X POST https://api.example.com/users/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

{"id":"user-123","name":"Alice","email":"alice@example.com"}
```

### 4. Generate MCP Tool

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server';
import { userCreate } from './commands/user-create';

const server = new Server({ name: 'my-mcp-server' });

server.setRequestHandler('tools/list', async () => ({
  tools: [userCreate.toMCP()],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'user_create') {
    return await userCreate.executeMCP(request.params.arguments);
  }
});
```

---

## Advanced Usage

### Interface-Specific Options

```typescript
new UniversalCommand({
  name: 'data export',
  // ... base definition ...

  // CLI-specific
  cli: {
    format: (data) => {
      // Custom formatting for terminal
      return JSON.stringify(data, null, 2);
    },
    streaming: true, // Support streaming output
    progress: true, // Show progress bar
  },

  // API-specific
  api: {
    method: 'GET', // Default: infer from handler
    cacheControl: {
      maxAge: 300,
      staleWhileRevalidate: 60,
    },
    rateLimit: {
      requests: 100,
      window: '1m',
    },
    auth: {
      required: true,
      roles: ['admin'],
    },
  },

  // MCP-specific
  mcp: {
    resourceLinks: ['export://results'],
    capabilities: ['streaming'],
  },
});
```

### Execution Context

The `context` parameter provides interface-specific information:

```typescript
handler: async (args, context) => {
  switch (context.interface) {
    case 'cli':
      // CLI-specific logic
      console.log('Running from CLI');
      break;

    case 'api':
      // Access request object
      const userId = context.request.headers.get('x-user-id');
      break;

    case 'mcp':
      // MCP-specific logic
      break;
  }

  return result;
};
```

### Validation

Input validation is automatic based on parameter definitions:

```typescript
input: {
  parameters: [
    {
      name: 'age',
      type: 'number',
      required: true,
      min: 0,
      max: 120,
    },
    {
      name: 'email',
      type: 'string',
      required: true,
      pattern: '^[^@]+@[^@]+\\.[^@]+$',
    },
  ];
}
```

### Error Handling

```typescript
handler: async (args, context) => {
  if (!isValid(args.email)) {
    throw new CommandError('Invalid email address', { code: 'INVALID_EMAIL', status: 400 });
  }

  return result;
};
```

Errors are automatically formatted for each interface:

- **CLI**: Formatted error message with exit code
- **API**: JSON error response with status code
- **MCP**: MCP error format

---

## Runtime Registration (No Code Generation)

For the simplest setup, use `RuntimeServer` to register commands and serve them directly:

```typescript
import { createRuntimeServer } from '@supernal/universal-command';

const server = createRuntimeServer();

// Register commands
server.register(userCreate);
server.register(userList);
server.register(userDelete);

// Or define inline
server.command({
  name: 'health check',
  description: 'Check system health',
  input: { parameters: [] },
  output: { type: 'json' },
  handler: async () => ({ status: 'ok' }),
});
```

### Serve as Next.js API

```typescript
// app/api/[...path]/route.ts
import { createServer } from '@/lib/commands';

const server = createServer();
const handlers = server.getNextHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
```

### Serve as Express API

```typescript
import express from 'express';
import { createServer } from './commands';

const app = express();
app.use(express.json());
app.use('/api', createServer().getExpressRouter());
app.listen(3000);
```

### Serve as MCP Server

```typescript
import { createServer } from './commands';

const server = createServer();
await server.startMCP({
  name: 'my-mcp-server',
  version: '1.0.0',
  transport: 'stdio',
});
```

### List All Commands

```typescript
for (const cmd of server.listCommands()) {
  console.log(`${cmd.name} → API: ${cmd.apiPath}, MCP: ${cmd.mcpTool}`);
}
```

---

## Registry Pattern

For multiple commands, use a registry:

```typescript
// commands/index.ts
import { CommandRegistry } from '@supernal/universal-command';
import { userCreate } from './user-create';
import { userList } from './user-list';
import { userDelete } from './user-delete';

export const registry = new CommandRegistry();

registry.register(userCreate);
registry.register(userList);
registry.register(userDelete);
```

### Generate CLI Program

```typescript
import { Command } from 'commander';
import { registry } from './commands';

const program = new Command();

for (const cmd of registry.getAll()) {
  program.addCommand(cmd.toCLI());
}

program.parse();
```

### Generate API Routes (Build-time)

```typescript
// scripts/generate-routes.ts
import { registry } from '../commands';
import { generateNextRoutes } from '@supernal/universal-command/codegen';

await generateNextRoutes(registry, {
  outputDir: 'app/api',
  typescript: true,
});
```

Generates:

```
app/api/
  users/
    create/
      route.ts  (auto-generated)
    list/
      route.ts  (auto-generated)
    delete/
      route.ts  (auto-generated)
```

### Generate MCP Server

```typescript
import { Server } from '@modelcontextprotocol/sdk/server';
import { registry } from './commands';
import { createMCPServer } from '@supernal/universal-command/mcp';

const server = createMCPServer(registry, {
  name: 'my-mcp-server',
  version: '1.0.0',
});

server.connect(transport);
```

---

## Code Generation

### CLI Generation (Runtime)

```typescript
const cli = command.toCLI();
// Returns: Commander.Command
```

### API Generation (Build-time or Runtime)

```typescript
// Runtime (Next.js App Router)
export const GET = command.toNextAPI();

// Or build-time generation
import { generateNextRoutes } from '@supernal/universal-command/codegen';
await generateNextRoutes(registry, { outputDir: 'app/api' });
```

### MCP Generation (Runtime)

```typescript
const mcpTool = command.toMCP();
// Returns: MCPToolDefinition
```

---

## Testing

### Test the Handler Once

```typescript
import { userCreate } from './user-create';

test('creates user', async () => {
  const result = await userCreate.execute(
    { name: 'Alice', email: 'alice@example.com' },
    { interface: 'test' } // Test context
  );

  expect(result.name).toBe('Alice');
});
```

### Integration Testing Helpers

```typescript
import { testCLI, testAPI, testMCP } from '@supernal/universal-command/testing';

test('CLI integration', async () => {
  const output = await testCLI(userCreate, {
    args: ['--name', 'Alice', '--email', 'alice@example.com'],
  });

  expect(output).toContain('Created user');
});

test('API integration', async () => {
  const response = await testAPI(userCreate, {
    method: 'POST',
    body: { name: 'Alice', email: 'alice@example.com' },
  });

  expect(response.status).toBe(200);
});

test('MCP integration', async () => {
  const result = await testMCP(userCreate, {
    arguments: { name: 'Alice', email: 'alice@example.com' },
  });

  expect(result.content[0].text).toContain('Alice');
});
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          UniversalCommand Definition                │
│  • name, description, category                      │
│  • input schema (parameters)                        │
│  • output schema                                     │
│  • handler (core logic)                             │
│  • interface overrides (cli, api, mcp)              │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┼────────┐
        │        │        │
    ┌───▼──┐ ┌──▼───┐ ┌──▼───┐
    │ CLI  │ │ API  │ │ MCP  │
    │ Gen  │ │ Gen  │ │ Gen  │
    └──┬───┘ └──┬───┘ └──┬───┘
       │        │        │
    ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
    │ CLI │  │ API │  │ MCP │
    │ App │  │ App │  │ App │
    └─────┘  └─────┘  └─────┘
```

---

## API Reference

### `UniversalCommand`

```typescript
class UniversalCommand<TInput, TOutput> {
  constructor(schema: CommandSchema<TInput, TOutput>);

  // Execute command
  execute(args: TInput, context: ExecutionContext): Promise<TOutput>;

  // Generate interfaces
  toCLI(): Command;
  toNextAPI(): NextAPIRoute;
  toExpressAPI(): ExpressRoute;
  toMCP(): MCPToolDefinition;

  // Utilities
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

  output: {
    type: 'json' | 'text' | 'stream';
    schema?: JSONSchema;
  };

  handler: (args: TInput, context: ExecutionContext) => Promise<TOutput>;

  // Interface-specific options
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
  description: string;
  required?: boolean;
  default?: any;

  // Validation
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  items?: Parameter; // For array type
}
```

### `ExecutionContext`

```typescript
interface ExecutionContext {
  interface: 'cli' | 'api' | 'mcp' | 'test';
  projectRoot?: string;

  // API-specific
  request?: NextRequest | Request;

  // CLI-specific
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
}
```

---

## Comparison

| Feature              | Universal Command    | Manual Implementation     |
| -------------------- | -------------------- | ------------------------- |
| **Maintenance**      | Define once          | Define 3x (CLI/API/MCP)   |
| **Drift risk**       | None (single source) | High (separate codebases) |
| **Type safety**      | Full TypeScript      | Varies by interface       |
| **Validation**       | Automatic            | Manual per interface      |
| **Testing**          | Test once            | Test 3x                   |
| **Documentation**    | Auto-generated       | Manual                    |
| **Feature velocity** | High (add once)      | Low (add 3x)              |

---

## Real-World Examples

### GitHub CLI + API + MCP

```typescript
// Single definition
const issueCreate = new UniversalCommand({
  name: 'issue create',
  description: 'Create a GitHub issue',

  input: {
    parameters: [
      { name: 'title', type: 'string', required: true },
      { name: 'body', type: 'string' },
      { name: 'labels', type: 'array', items: { type: 'string' } },
    ],
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

// Deploy everywhere
const cli = issueCreate.toCLI(); // gh issue create
const api = issueCreate.toNextAPI(); // POST /api/issues
const mcp = issueCreate.toMCP(); // issue_create tool
```

---

## Roadmap

### v1.0 (Current)

- ✅ Core abstraction
- ✅ CLI generation (Commander.js)
- ✅ Next.js API generation
- ✅ MCP generation
- ✅ TypeScript support

### v1.1 (Planned)

- 🔄 Express.js API generation
- 🔄 Streaming support
- 🔄 Progress indicators
- 🔄 Auto-generated docs

### v2.0 (Future)

- 📋 Hono API generation
- 📋 FastAPI generation (Python)
- 📋 gRPC generation
- 📋 GraphQL generation

---

## Development Workflow

This project uses the [Supernal Coding](https://github.com/supernalintelligence/supernal-coding) workflow system for requirement tracking and test traceability.

### Requirements

All features are documented as requirements in `.supernal/requirements/`:

| Requirement                                                               | Description            | Tests |
| ------------------------------------------------------------------------- | ---------------------- | ----- |
| [REQ-UC-001](.supernal/requirements/req-uc-001-universal-command-core.md) | Universal Command Core | 20    |
| [REQ-UC-002](.supernal/requirements/req-uc-002-command-registry.md)       | Command Registry       | 16    |
| [REQ-UC-003](.supernal/requirements/req-uc-003-code-generators.md)        | Code Generators        | 18    |
| [REQ-UC-004](.supernal/requirements/req-uc-004-scope-registry.md)         | Scope Registry         | 30    |
| [REQ-UC-005](.supernal/requirements/req-uc-005-testing-utilities.md)      | Testing Utilities      | 9     |

### Git Hooks

Pre-commit hooks ensure code quality:

- **Lint-staged**: Format and lint staged files
- **Type check**: TypeScript compilation
- **Tests**: All 93 tests must pass

```bash
# Hooks run automatically on commit
git commit -m "feat: add new feature"

# Run manually
npm run type-check && npm run test:ci
```

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Credits

Developed by [Supernal Intelligence](https://supernal.ai) as part of the [Supernal Coding](https://github.com/supernalintelligence/supernal-coding) project.

Inspired by the need to maintain CLI, API, and MCP interfaces for AI-assisted development tools.

---

## Related Projects

- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Next.js](https://nextjs.org) - React framework with API routes
- [Model Context Protocol](https://modelcontextprotocol.io) - AI tool integration
- [tRPC](https://trpc.io) - End-to-end typesafe APIs

---

## Support

- 📖 [Documentation](https://docs.supernal.ai/universal-command)
- 💬 [Discord](https://discord.gg/supernal)
- 🐛 [Issue Tracker](https://github.com/supernalintelligence/universal-command/issues)
- ✉️ Email: support@supernal.ai
