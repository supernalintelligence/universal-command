# Scope-Based MCP Tool Discovery

## Overview

The Universal Command MCP server uses a **scope-based architecture** for incremental tool discovery. Instead of exposing all tools at once (which can overwhelm AI context), scopes group related tools into semantic namespaces that can be loaded/unloaded dynamically.

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    global    │  │  requirement │  │     git      │       │
│  │   (loaded)   │  │  (unloaded)  │  │  (unloaded)  │       │
│  │              │  │              │  │              │       │
│  │ - health     │  │ - list       │  │ - commit     │       │
│  │ - search     │  │ - create     │  │ - branch     │       │
│  │ - help       │  │ - update     │  │ - merge      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  Meta-tools: load_scope, unload_scope, list_scopes          │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Initial State

When the MCP server starts, only the **global scope** is loaded. The AI sees:

```json
{
  "tools": [
    { "name": "sc_health_context", "description": "..." },
    { "name": "load_scope", "description": "Load a scope to access its tools" },
    { "name": "unload_scope", "description": "Unload a scope" },
    { "name": "list_scopes", "description": "List available scopes" }
  ]
}
```

### 2. Scope Discovery

The AI can discover available scopes:

```
AI: tools/call list_scopes {}

Response:
[
  { "id": "global", "loaded": true, "toolCount": 3 },
  { "id": "requirement", "loaded": false, "toolCount": 5 },
  { "id": "git", "loaded": false, "toolCount": 8 },
  { "id": "deploy", "loaded": false, "toolCount": 4 }
]
```

### 3. Loading Scopes

When the AI needs requirement tools:

```
AI: tools/call load_scope { "scope": "requirement" }

Response: "Loaded scope 'requirement' with 5 tools. Use tools/list to see updated tool list."
```

Now `tools/list` returns:
```json
{
  "tools": [
    { "name": "sc_health_context" },
    { "name": "sc_requirement_list" },
    { "name": "sc_requirement_create" },
    { "name": "sc_requirement_update" },
    // ...
  ]
}
```

### 4. Unloading Scopes

When switching context:

```
AI: tools/call unload_scope { "scope": "requirement" }
AI: tools/call load_scope { "scope": "git" }
```

## Scope Definition

Scopes are defined with metadata for discovery:

```typescript
const requirementScope: Scope = {
  id: 'requirement',
  name: 'Requirement Management',
  description: 'Tools for managing project requirements',
  keywords: ['requirement', 'req', 'spec', 'feature'],

  // Optional: Required state for scope availability
  requiredStates: ['project-loaded'],

  // Optional: Hierarchical scopes
  parent: 'planning',
  children: ['user-stories', 'acceptance-criteria'],

  // Optional: Auto-loading behavior
  autoLoad: false,
  loadWithParent: true
};
```

## Registering Commands in Scopes

Commands specify their scope in the schema:

```typescript
const requirementList = new UniversalCommand({
  name: 'requirement list',
  description: 'List project requirements',
  scope: 'requirement',  // <-- Scope assignment
  // ...
});
```

Commands without an explicit scope go to `global`.

## O(1) Lookups

The ScopeRegistry uses Map-based indexes for efficient lookup:

```typescript
// O(1) by scope + name
registry.getCommand('requirement', 'requirement list');

// O(1) by MCP tool name
registry.findByMCPName('sc_requirement_list');

// O(1) by API path
registry.findByAPIPath('requirement/list');
```

## Benefits

1. **Reduced Context Overhead**: AI only sees relevant tools
2. **Semantic Grouping**: Tools organized by domain
3. **Progressive Discovery**: Load what you need, when you need it
4. **State-Aware**: Scopes can require project state
5. **Hierarchical**: Parent/child scope relationships

## Usage in SC

### Current Implementation

```javascript
// bin/sc-mcp-server.js
const server = createSCUniversalServer();

await server.startMCP({
  name: 'sc-universal-commands',
  version: '1.0.0',
  useScopes: true,           // Enable scope-based loading
  enableScopeLoading: true   // Add load_scope/unload_scope meta-tools
});
```

### Planned Scopes for SC

| Scope | Description | Tools |
|-------|-------------|-------|
| `global` | Always available | health, help, search |
| `requirement` | Requirement management | list, create, update, validate |
| `git` | Git operations | commit, branch, merge, status |
| `planning` | Planning & features | feature, phase, epic |
| `deploy` | Deployment | build, deploy, release |
| `test` | Testing | run, coverage, audit |
| `compliance` | Compliance checks | check, report, trace |

## Integration with Claude

Configure in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sc": {
      "command": "node",
      "args": ["/path/to/supernal-code-package/bin/sc-mcp-server.js"]
    }
  }
}
```

Claude will start with global tools and can load additional scopes as needed based on the conversation context.

## Future: State-Aware Scopes

Scopes can declare required states:

```typescript
const deployScope: Scope = {
  id: 'deploy',
  requiredStates: ['project-loaded', 'ci-configured']
};
```

When AI calls `list_scopes`, unavailable scopes can be marked:

```json
{
  "id": "deploy",
  "available": false,
  "reason": "Requires: ci-configured"
}
```

This prevents the AI from trying to use tools that won't work in the current project state.
