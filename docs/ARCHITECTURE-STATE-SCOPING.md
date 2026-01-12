# State-Aware Tool Scoping Architecture

## The Problem

When exposing tools to AI via MCP or other interfaces, we face a fundamental challenge:

**All tools are not always relevant.**

An AI assistant doesn't need access to "delete production database" when the user is just editing a README. Having too many tools:
1. Increases token usage (tool descriptions consume context)
2. Confuses the AI (more choices = worse decisions)
3. Creates safety risks (irrelevant dangerous tools available)

## Current Approaches

### @supernal/interface: LocationScope (Runtime)

```typescript
@Tool()
@LocationScope({ pages: ['/blog', '/posts'] })
publishPost() { }  // Only available on blog pages
```

**How it works:**
- Decorator registers scope metadata
- At runtime, `LocationContext.getCurrent()` returns current page/route
- MCP server filters tools: `ToolRegistry.getToolsGroupedByContainerForLocation()`
- Only matching tools exposed to AI

**Pros:**
- Dynamic: Scope evaluated at request time
- Works with SPA navigation
- No code generation needed

**Cons:**
- Requires runtime context tracking
- Scope definitions scattered in code
- No static analysis possible

### Code Generation Approach: Named Trees

For static/build-time systems, we need a different model:

```
STEP 1: Scan codebase → Generate "Names" (tree structure)
────────────────────────────────────────────────────────
src/
  commands/
    requirement/
      list.ts     → requirement.list
      create.ts   → requirement.create
    user/
      list.ts     → user.list
      create.ts   → user.create

Output: names.ts
  requirement.list
  requirement.create
  user.list
  user.create

STEP 2: Label Names with Scopes/Permissions
────────────────────────────────────────────
// scopes.ts (manual or auto-generated)
export const toolScopes = {
  'requirement.list': {
    states: ['project-loaded'],
    aiEnabled: true,
    dangerLevel: 'safe'
  },
  'requirement.create': {
    states: ['project-loaded', 'git-initialized'],
    aiEnabled: true,
    dangerLevel: 'moderate',
    requiresApproval: true
  },
  'user.delete': {
    states: ['admin-mode'],
    aiEnabled: false,  // Disabled by default
    dangerLevel: 'destructive'
  }
};

STEP 3: Generate State-Aware MCP Server
────────────────────────────────────────
// Generated: mcp-server.ts
const currentState = getApplicationState();
const availableTools = registry
  .getAll()
  .filter(tool => {
    const scope = toolScopes[tool.name];
    return scope.states.every(s => currentState.includes(s));
  });
```

## The State Model

### What is "State"?

State represents the current context in which tools operate:

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION STATE                         │
│                                                                  │
│  Location State          │  Capability State                    │
│  ─────────────           │  ────────────────                    │
│  • Current route/page    │  • project-loaded                    │
│  • Active modal/dialog   │  • git-initialized                   │
│  • Selected item         │  • authenticated                     │
│  • Navigation depth      │  • admin-mode                        │
│                          │  • offline-mode                      │
│                                                                  │
│  Entity State            │  Workflow State                      │
│  ────────────            │  ──────────────                      │
│  • Selected requirement  │  • editing-requirement               │
│  • Current repo          │  • reviewing-pr                      │
│  • Active branch         │  • deploying                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Transitions

```
                    ┌─────────────────┐
                    │   Initial State │
                    │   (no project)  │
                    └────────┬────────┘
                             │ sc init
                             ▼
                    ┌─────────────────┐
                    │ project-loaded  │
                    │ git-initialized │
                    └────────┬────────┘
                             │ sc requirement create
                             ▼
                    ┌─────────────────┐
                    │ project-loaded  │
                    │ git-initialized │
                    │ editing-req     │ ← More tools available
                    └─────────────────┘
```

## Scoping Strategies

### Strategy 1: Flat Tool List (Current MCP Default)

```typescript
// All tools always available
server.setRequestHandler('tools/list', async () => {
  return { tools: registry.getAll().map(t => t.toMCP()) };
});
```

**Pros:** Simple, stateless
**Cons:** Token waste, confusion, safety risks

### Strategy 2: State-Based Filtering

```typescript
// Filter by current state
server.setRequestHandler('tools/list', async () => {
  const state = await getApplicationState();
  const tools = registry.getAll().filter(t =>
    isToolAvailableInState(t, state)
  );
  return { tools: tools.map(t => t.toMCP()) };
});
```

**Pros:** Reduces tool count, safer
**Cons:** Requires state tracking, dynamic

### Strategy 3: Tool Namespaces (Hierarchical)

```typescript
// Group tools by namespace
tools/list response:
{
  tools: [
    { name: 'requirement', description: 'Requirement management tools' },
    { name: 'git', description: 'Git operations' },
    { name: 'deploy', description: 'Deployment tools' }
  ]
}

// AI calls namespace first, then gets expanded tools
tools/call { name: 'requirement' } → returns sub-tools
```

**Pros:** Progressive disclosure, cleaner UX
**Cons:** Two-step invocation, more complex protocol

### Strategy 4: Context Rooms (MCP Resource Pattern)

```typescript
// Define "rooms" as MCP resources
resources: [
  { uri: 'room://project', name: 'Project Context' },
  { uri: 'room://git', name: 'Git Context' },
  { uri: 'room://deployment', name: 'Deployment Context' }
]

// AI "enters" a room, tools scoped to that room
tools/list?room=project → only project-related tools
```

**Pros:** Explicit context switching, familiar pattern
**Cons:** Requires AI to manage room selection

### Strategy 5: Capability Manifests

```typescript
// Server advertises capabilities
capabilities: {
  tools: {
    scopes: ['project', 'git', 'deployment'],
    stateAware: true
  }
}

// Client requests tools for specific scope
tools/list { scope: 'project' }
```

**Pros:** Clean separation, explicit
**Cons:** Not standard MCP (yet)

## Comparison Matrix

| Strategy | Token Usage | Safety | Complexity | Dynamic | Standard MCP |
|----------|-------------|--------|------------|---------|--------------|
| Flat List | High | Low | Low | No | Yes |
| State-Based | Medium | High | Medium | Yes | Yes |
| Namespaces | Low | Medium | High | No | Partial |
| Context Rooms | Low | High | Medium | Yes | Via Resources |
| Capability Manifests | Low | High | Medium | Yes | No |

## Recommended Approach

### For SC: Hybrid State + Namespace

```typescript
// 1. Define state-aware tool registry
const toolRegistry = new StateAwareRegistry({
  states: {
    'project-loaded': {
      description: 'A supernal project is loaded',
      detector: () => fs.existsSync('supernal.yaml')
    },
    'git-initialized': {
      description: 'Git repository exists',
      detector: () => fs.existsSync('.git')
    }
  }
});

// 2. Register tools with state requirements
toolRegistry.register(requirementList, {
  requiredStates: ['project-loaded'],
  namespace: 'requirement'
});

// 3. MCP server uses current state
server.setRequestHandler('tools/list', async () => {
  const currentStates = await toolRegistry.detectCurrentStates();
  const tools = toolRegistry.getToolsForStates(currentStates);

  // Optionally group by namespace for cleaner presentation
  return { tools: groupByNamespace(tools) };
});
```

### State Detection Pattern

```typescript
// State detector registry
const stateDetectors: Record<string, () => Promise<boolean>> = {
  'project-loaded': async () => {
    return fs.existsSync(path.join(process.cwd(), 'supernal.yaml'));
  },
  'git-initialized': async () => {
    return fs.existsSync(path.join(process.cwd(), '.git'));
  },
  'has-requirements': async () => {
    const reqs = await RequirementManager.list();
    return reqs.length > 0;
  },
  'ci-configured': async () => {
    return fs.existsSync('.github/workflows') || fs.existsSync('.gitlab-ci.yml');
  }
};

// Detect current states
async function detectCurrentStates(): Promise<string[]> {
  const states: string[] = [];
  for (const [name, detector] of Object.entries(stateDetectors)) {
    if (await detector()) {
      states.push(name);
    }
  }
  return states;
}
```

## Implementation Plan

### Phase 1: State Detection
- [ ] Add state detector interface to universal-command
- [ ] Implement common detectors (project, git, etc.)
- [ ] Add `requiredStates` to CommandSchema

### Phase 2: Scoped MCP
- [ ] Modify RuntimeServer.startMCP to filter by state
- [ ] Add state refresh mechanism (on file changes, etc.)
- [ ] Test with Claude Desktop

### Phase 3: Code Generation
- [ ] Add state metadata to generated code
- [ ] Create "names" tree generator
- [ ] Add scope labeling workflow

### Phase 4: Integration with @supernal/interface
- [ ] Map LocationScope to state model
- [ ] Unified scope definitions
- [ ] Shared state detection

## Open Questions

1. **State Refresh Frequency**
   - On every tools/list call?
   - Cached with TTL?
   - File-watcher triggered?

2. **Nested States**
   - Can states be hierarchical? (project → project.requirements → project.requirements.editing)
   - Or flat list with AND logic?

3. **State Persistence**
   - Should MCP server remember state between calls?
   - Or stateless per-request?

4. **Multi-Project**
   - How to handle multiple projects open?
   - Per-workspace state?

5. **MCP Protocol Evolution**
   - Is Anthropic planning native scope support?
   - Should we contribute to MCP spec?

## Research: Existing Solutions

### OpenAI Agents SDK - Tool Filtering (Most Relevant)

The [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/mcp/) provides the most mature tool filtering implementation:

```python
from agents.mcp import MCPServerStdio, create_static_tool_filter, ToolFilterContext

# Static filtering (allow/block lists)
server = MCPServerStdio(
    params={"command": "npx", "args": [...]},
    tool_filter=create_static_tool_filter(
        allowed_tool_names=["read_file", "write_file"],
        blocked_tool_names=["delete_file"]
    )
)

# Dynamic filtering (context-aware)
async def context_aware_filter(context: ToolFilterContext, tool) -> bool:
    if context.agent.name == "Code Reviewer" and tool.name.startswith("danger_"):
        return False
    return True

server = MCPServerStdio(
    params={"command": "npx", "args": [...]},
    tool_filter=context_aware_filter
)
```

**Key insight:** `ToolFilterContext` exposes:
- `run_context` - the current execution context
- `agent` - which agent is requesting tools
- `server_name` - which MCP server

This is exactly the pattern we need - filtering happens at the HOST level, not server level.

### Portkey MCP Tool Filter (Semantic Filtering)

[Portkey's mcp-tool-filter](https://github.com/Portkey-AI/mcp-tool-filter) takes a different approach:

```typescript
// Reduces 1000+ tools to relevant 10-20 using embeddings
const filter = new MCPToolFilter({
  embeddingModel: 'local'  // or 'openai', 'voyage'
});

const relevantTools = await filter.filter(
  allTools,
  userQuery,  // "I want to read a file"
  { topK: 10, threshold: 0.7 }
);
```

**How it works:**
1. Embed tool descriptions into vectors
2. Embed user query
3. Cosine similarity to find relevant tools
4. Return top-K matches

**Performance:** Under 10ms with local embeddings.

**Trade-off:** Semantic matching may miss tools that don't textually match but are relevant.

### MCP Specification (2025-11-25)

The [MCP spec](https://modelcontextprotocol.io/specification/2025-11-25) itself doesn't define tool filtering, but provides security primitives:

- **Resource Indicators (RFC 8707)**: Tokens scoped to specific servers
- **Explicit Context Declarations**: Models access only predefined contexts
- **Permission Controls**: Authentication required for access

**Key insight:** MCP spec expects filtering to happen at HOST level, not protocol level.

### Known Patterns

| Pattern | Source | How It Works |
|---------|--------|--------------|
| `when` clauses | VS Code | Declarative conditions for command availability |
| RBAC | Kubernetes | Role-based access to resources |
| Feature Flags | LaunchDarkly | Targeting rules for feature exposure |
| Scopes | OAuth 2.0 | Token-level permission boundaries |

### Synthesis

There are three complementary approaches:

1. **Static Filtering** (allow/block lists) - Simple, fast, explicit
2. **State-Based Filtering** (our approach) - Dynamic, context-aware
3. **Semantic Filtering** (embeddings) - AI-driven, query-aware

For SC, we should implement **State-Based Filtering** with optional **Static Filtering** as override.
Semantic filtering is overkill for our tool count but interesting for large tool ecosystems.

## Conclusion

The state-aware scoping problem is real and important. The recommended approach:

1. **Short-term**: Implement state-based filtering in RuntimeServer
2. **Medium-term**: Add namespace grouping for cleaner AI UX
3. **Long-term**: Contribute scope semantics to MCP specification

This bridges the gap between:
- **universal-command** (command definitions)
- **@supernal/interface** (runtime scoping)
- **MCP protocol** (AI tool discovery)
