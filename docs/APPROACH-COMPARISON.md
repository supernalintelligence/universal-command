# Approach Comparison: Code Generation vs Runtime Registration

## Overview

There are fundamentally two ways to expose commands to CLI/API/MCP:

| Approach | Flow | When Binding Happens |
|----------|------|---------------------|
| **Code Generation** | Schema → Generate Files → Import at Runtime | Build time |
| **Runtime Registration** | Schema → Register → Serve Directly | Runtime |

## Detailed Comparison

### Code Generation (Top-Down with Files)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ CommandSchema   │ ──▶ │   Generator     │ ──▶ │  Generated      │
│ (source of      │     │   (build step)  │     │  Files          │
│  truth)         │     │                 │     │  route.ts       │
└─────────────────┘     └─────────────────┘     │  mcp-server.ts  │
                                                 │  openapi.yaml   │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Import/Run     │
                                                 │  at Runtime     │
                                                 └─────────────────┘
```

**Pros:**
- ✅ Static analysis possible (types, linting)
- ✅ No runtime overhead for generation
- ✅ Files can be inspected, debugged, modified
- ✅ Works with serverless (pre-built routes)
- ✅ Standard framework patterns (Next.js App Router)
- ✅ Can generate for any target (Python, Go, etc.)

**Cons:**
- ❌ Extra build step required
- ❌ Generated files must be kept in sync
- ❌ Drift risk if generator not re-run
- ❌ Can't change at runtime
- ❌ State/scope must be in generated code

**Best For:**
- Production deployments
- Serverless platforms (Vercel, Netlify)
- Multi-language targets
- OpenAPI documentation

### Runtime Registration (Bottom-Up, No Files)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ CommandSchema   │ ──▶ │  RuntimeServer  │ ──▶ │  Live API/MCP   │
│ (source of      │     │  .register()    │     │  (served        │
│  truth)         │     │                 │     │   directly)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Pros:**
- ✅ No build step
- ✅ Always in sync (single source of truth)
- ✅ Dynamic: can add/remove at runtime
- ✅ State-aware scoping is natural
- ✅ Simpler development workflow
- ✅ Hot reloading friendly

**Cons:**
- ❌ Runtime overhead (registration on startup)
- ❌ Harder to debug (no files to inspect)
- ❌ May not work with all deployment targets
- ❌ Limited to JavaScript/TypeScript targets

**Best For:**
- Development/prototyping
- Dynamic tool systems
- State-aware MCP servers
- Monolithic servers (Express, Fastify)

### @supernal/interface Pattern (Decorator-Based)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ @Tool decorator │ ──▶ │  ToolRegistry   │ ──▶ │  Runtime MCP    │
│ (on functions)  │     │  (auto-filled   │     │  ChatAdapter    │
│                 │     │   at load)      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Pros:**
- ✅ Minimal boilerplate (just add decorator)
- ✅ Collocated with implementation
- ✅ Inference from method names
- ✅ LocationScope for runtime filtering
- ✅ Works with existing classes

**Cons:**
- ❌ Metadata scattered across files
- ❌ Hard to get full picture of all tools
- ❌ Inference can be wrong
- ❌ TypeScript decorators have limitations
- ❌ No code generation for CLI/API

**Best For:**
- React/UI applications
- Gradual adoption (decorate existing code)
- AI chat integrations

## State/Scope Handling Comparison

### Code Generation: Static Scope

```typescript
// Generated at build time - scopes are fixed
// mcp-server.ts (generated)
const tools = [
  { name: 'requirement.list', scope: 'project' },
  { name: 'git.commit', scope: 'git' }
];

// Must regenerate to change scopes
```

**Problem:** Can't adapt to runtime state without regeneration.

**Solution:** Generate with scope metadata, filter at runtime:
```typescript
// Generated
const toolScopes = {
  'requirement.list': ['project-loaded'],
  'git.commit': ['project-loaded', 'git-initialized']
};

// Runtime
const currentState = detectState();
const availableTools = tools.filter(t =>
  toolScopes[t.name].every(s => currentState.includes(s))
);
```

### Runtime Registration: Dynamic Scope

```typescript
// Natural fit - state checked on each request
server.setRequestHandler('tools/list', async () => {
  const state = await detectCurrentState();
  return {
    tools: registry
      .getAll()
      .filter(t => t.isAvailableIn(state))
      .map(t => t.toMCP())
  };
});
```

**Advantage:** State is always current.

### Decorator Pattern: LocationScope

```typescript
@Tool()
@LocationScope({ pages: ['/projects/*'] })
createRequirement() { }
```

**How it works:**
- LocationContext tracks current page/route
- MCP server filters by matching LocationScope
- Automatic, but limited to location (not capability state)

## "Names" Generation (Tree Structure)

Both code generation and runtime registration can benefit from a "names" step:

### Why Names?

```
BEFORE: Flat list of tools
─────────────────────────
sc_requirement_list
sc_requirement_create
sc_requirement_delete
sc_git_commit
sc_git_push
sc_deploy_staging
sc_deploy_production

AFTER: Named tree
──────────────────
requirement/
  list
  create
  delete
git/
  commit
  push
deploy/
  staging
  production
```

**Benefits:**
1. Namespace prevents collisions
2. Hierarchical organization
3. Can scope entire branches (disable all deploy/ tools)
4. Matches CLI structure (sc requirement list)

### Names Generation Process

```
STEP 1: Scan/Define
────────────────────
// Source files or explicit definitions
src/commands/
  requirement/list.ts
  requirement/create.ts
  git/commit.ts

// OR explicit
const commands = ['requirement.list', 'requirement.create', 'git.commit'];

STEP 2: Generate Names Module
─────────────────────────────
// names.ts (generated or manual)
export const Names = {
  requirement: {
    list: 'requirement.list',
    create: 'requirement.create'
  },
  git: {
    commit: 'git.commit'
  }
} as const;

STEP 3: Annotate with Scope/Permissions
───────────────────────────────────────
// scopes.ts (manual annotation layer)
export const toolScopes: Record<string, ToolScope> = {
  [Names.requirement.list]: {
    states: ['project-loaded'],
    aiEnabled: true,
    dangerLevel: 'safe'
  },
  [Names.requirement.create]: {
    states: ['project-loaded'],
    aiEnabled: true,
    dangerLevel: 'moderate'
  },
  [Names.git.commit]: {
    states: ['project-loaded', 'git-initialized'],
    aiEnabled: true,
    dangerLevel: 'moderate',
    requiresApproval: true
  }
};
```

## When to Use What

### Use Code Generation When:
- Deploying to serverless (Vercel, AWS Lambda)
- Need OpenAPI documentation
- Multi-language targets (Python clients, etc.)
- Want static analysis of generated routes
- Production stability is priority

### Use Runtime Registration When:
- Rapid development/prototyping
- Dynamic tool systems (plugins, extensions)
- State-aware MCP that adapts to context
- Monolithic server deployment
- Hot reloading during development

### Use Decorators When:
- Existing React/UI codebase
- Want minimal changes to existing code
- AI chat integration is primary use case
- LocationScope (page-based) scoping is sufficient

## Hybrid Approach (Recommended for SC)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CommandSchema                            │
│                    (Single Source of Truth)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Code Gen      │ │ Runtime Reg  │ │ CLI Direct   │
    │ (production)  │ │ (dev + MCP)  │ │ (always)     │
    └───────┬───────┘ └──────┬───────┘ └──────┬───────┘
            │                │                │
            ▼                ▼                ▼
    ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Vercel API    │ │ MCP Server   │ │ CLI Binary   │
    │ routes        │ │ (state-aware)│ │              │
    └───────────────┘ └──────────────┘ └──────────────┘
```

**Implementation:**

```typescript
// commands/index.ts - Single source of truth
export const commands = [
  requirementList,
  requirementCreate,
  gitCommit,
  deployProduction
];

export const scopes: Record<string, ToolScope> = {
  'requirement.list': { states: ['project'], aiEnabled: true },
  // ...
};

// For production API (Vercel): Generate routes
// npm run generate:routes

// For MCP (development): Runtime registration
const server = createRuntimeServer();
commands.forEach(c => server.register(c));
server.startMCP({ name: 'sc-mcp', version: '1.0.0' });

// For CLI: Direct generation
const program = new Command('sc');
commands.forEach(c => program.addCommand(c.toCLI()));
```

## Summary

| Aspect | Code Gen | Runtime Reg | Decorators |
|--------|----------|-------------|------------|
| Build Step | Required | None | None |
| State Handling | Static + Filter | Natural | LocationScope |
| Debugging | Easy (files) | Harder | Medium |
| Serverless | Yes | Limited | No |
| Hot Reload | No | Yes | Yes |
| Multi-lang | Yes | No | No |
| Boilerplate | Medium | Low | Lowest |
| Best For | Production | Dev + MCP | UI/React |

**Recommendation:** Use hybrid approach:
- **CLI**: Always direct (commands.forEach(c => c.toCLI()))
- **API**: Code generation for production
- **MCP**: Runtime registration with state awareness
