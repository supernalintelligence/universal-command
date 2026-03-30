# Room-Based Tool Architecture

## The Problem with `getAll().filter()`

Current approach:
```typescript
// INEFFICIENT: O(n) for every tools/list request
const tools = registry.getAll().filter(t => matchesState(t, currentState));
```

Problems:
1. **Linear scan** - Every request iterates all tools
2. **No semantic organization** - Flat list, no hierarchy
3. **Token waste** - LLM sees all tool descriptions even if filtered later
4. **No progressive disclosure** - Can't "zoom in" on domains

## The Room Model

Rooms are **semantically meaningful namespaces** that:
1. Group related tools
2. Enable O(1) lookup by room
3. Support hierarchical loading (load room → get its tools)
4. Align with @supernal/interface's container pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                         TOOL UNIVERSE                            │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   global    │  │ requirement │  │     git     │  ...         │
│  │   (room)    │  │   (room)    │  │   (room)    │              │
│  │             │  │             │  │             │              │
│  │ • help      │  │ • list      │  │ • status    │              │
│  │ • version   │  │ • create    │  │ • commit    │              │
│  │ • search    │  │ • update    │  │ • push      │              │
│  │             │  │ • delete    │  │ • branch    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

AI Request: "I want to work with requirements"
  → Load room: 'requirement'
  → Expose: [list, create, update, delete]
  → Global tools always available
```

## Data Structure Design

### Room Registry (Keyed, Not Filtered)

```typescript
interface Room {
  id: string;                      // 'requirement', 'git', 'deploy'
  name: string;                    // 'Requirement Management'
  description: string;             // For AI understanding
  keywords: string[];              // Semantic matching
  tools: Map<string, Command>;     // O(1) lookup by tool name

  // Hierarchy
  parent?: string;                 // Parent room ID
  children?: string[];             // Child room IDs

  // State requirements
  requiredStates?: string[];       // ['project-loaded']

  // Loading behavior
  autoLoad?: boolean;              // Always loaded (like 'global')
  loadWithParent?: boolean;        // Load when parent loads
}

class RoomRegistry {
  private rooms = new Map<string, Room>();
  private loadedRooms = new Set<string>();

  // O(1) room lookup
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // O(1) tool lookup within room
  getTool(roomId: string, toolName: string): Command | undefined {
    return this.rooms.get(roomId)?.tools.get(toolName);
  }

  // Load room into active set
  loadRoom(roomId: string): void {
    this.loadedRooms.add(roomId);
  }

  // Get all tools from loaded rooms (no filtering!)
  getLoadedTools(): Command[] {
    const tools: Command[] = [];
    for (const roomId of this.loadedRooms) {
      const room = this.rooms.get(roomId);
      if (room) {
        tools.push(...room.tools.values());
      }
    }
    return tools;
  }

  // Semantic room search
  findRooms(query: string): Room[] {
    // Could use embeddings for large registries
    return Array.from(this.rooms.values()).filter(r =>
      r.keywords.some(k => query.toLowerCase().includes(k)) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

### Why This Is Better

| Operation | Old (filter) | New (rooms) |
|-----------|--------------|-------------|
| List all tools | O(n) | O(loaded rooms × avg tools/room) |
| Get specific tool | O(n) | O(1) |
| Add tool context | Re-filter | Load room |
| Remove tool context | Re-filter | Unload room |
| Semantic search | O(n) | O(rooms) then O(1) |

## MCP Integration

### Two-Level Tool Discovery

```typescript
// Level 1: List available rooms (cheap, always works)
server.setRequestHandler('resources/list', async () => {
  return {
    resources: Array.from(roomRegistry.rooms.values()).map(room => ({
      uri: `room://${room.id}`,
      name: room.name,
      description: room.description,
      // Only show rooms that match current state
      available: room.requiredStates?.every(s => currentState.includes(s)) ?? true
    }))
  };
});

// Level 2: List tools (only from loaded rooms)
server.setRequestHandler('tools/list', async () => {
  // Always include global room
  if (!roomRegistry.isLoaded('global')) {
    roomRegistry.loadRoom('global');
  }

  return {
    tools: roomRegistry.getLoadedTools().map(t => t.toMCP())
  };
});

// AI can request to load a room
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'load_room') {
    const roomId = request.params.arguments.room;
    roomRegistry.loadRoom(roomId);
    return { content: [{ type: 'text', text: `Loaded room: ${roomId}` }] };
  }
  // ... handle normal tool calls
});
```

### Sample Interaction

```
AI: What rooms are available?
→ resources/list
← [
    { uri: "room://global", name: "Global", available: true },
    { uri: "room://requirement", name: "Requirements", available: true },
    { uri: "room://git", name: "Git Operations", available: true },
    { uri: "room://deploy", name: "Deployment", available: false }  // needs ci-configured
  ]

AI: I need to work with requirements
→ tools/call { name: "load_room", arguments: { room: "requirement" } }
← "Loaded room: requirement"

AI: What tools do I have now?
→ tools/list
← [
    // Global tools
    { name: "global.help", ... },
    { name: "global.search", ... },
    // Requirement tools (newly loaded)
    { name: "requirement.list", ... },
    { name: "requirement.create", ... },
    { name: "requirement.update", ... }
  ]
```

## Alignment with @supernal/interface

### Mapping Concepts

| universal-command | @supernal/interface | Purpose |
|-------------------|---------------------|---------|
| Room | Container | Semantic grouping |
| Room.id | containerId | Unique identifier |
| Room.requiredStates | LocationScope | Availability conditions |
| RoomRegistry | ToolRegistry grouped | Storage |
| loadRoom() | LocationContext.setCurrent() | Activate context |

### Shared Pattern

Both packages should use the same mental model:

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED MODEL                               │
│                                                                  │
│  Room/Container: Semantic namespace                              │
│  ├── id: unique identifier                                       │
│  ├── name: human-readable name                                   │
│  ├── description: for AI understanding                           │
│  ├── keywords: semantic matching                                 │
│  ├── tools: Map<string, Tool>  ← O(1) lookup                    │
│  ├── requiredStates: when available                              │
│  └── parent/children: hierarchy                                  │
│                                                                  │
│  Global Room: Always loaded, always available                    │
│  Domain Rooms: Loaded on demand                                  │
│  Nested Rooms: Load with parent or separately                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Semantic Room Discovery

For cases where AI doesn't know which room to load:

### Option 1: Keyword Matching (Fast)

```typescript
findRooms(query: "I want to create a new requirement"): Room[] {
  // Match keywords: ['requirement', 'create', 'new']
  // Finds: requirement room (keywords: ['requirement', 'req', 'spec'])
}
```

### Option 2: Embedding-Based (More Accurate)

```typescript
// Pre-compute room embeddings
const roomEmbeddings = new Map<string, number[]>();
for (const room of rooms) {
  roomEmbeddings.set(room.id, embed(room.name + ' ' + room.description));
}

// At query time
findRooms(query: string): Room[] {
  const queryEmbed = embed(query);
  return rooms
    .map(room => ({
      room,
      similarity: cosineSimilarity(queryEmbed, roomEmbeddings.get(room.id))
    }))
    .filter(r => r.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .map(r => r.room);
}
```

### Option 3: Hybrid (Recommended)

```typescript
findRooms(query: string): Room[] {
  // Fast path: exact keyword match
  const keywordMatches = rooms.filter(r =>
    r.keywords.some(k => query.toLowerCase().includes(k))
  );
  if (keywordMatches.length > 0) return keywordMatches;

  // Slow path: embedding similarity (only if no keyword match)
  return embeddingSearch(query, rooms);
}
```

## Room Hierarchy

For complex domains, rooms can be nested:

```
global/
  help
  version
  search

requirement/                    ← Domain room
  list
  create
  update
  delete

  traceability/                 ← Sub-room
    link
    unlink
    trace
    matrix

git/
  status
  commit
  push

  branch/                       ← Sub-room
    create
    switch
    delete
    merge
```

### Loading Behavior

```typescript
// Load parent → optionally load children
roomRegistry.loadRoom('requirement', { includeChildren: true });
// Now loaded: requirement, requirement.traceability

// Or load child directly
roomRegistry.loadRoom('requirement.traceability');
// Now loaded: requirement.traceability (parent NOT loaded)
```

## Implementation for universal-command

### 1. Add Room to CommandSchema

```typescript
interface CommandSchema {
  // ... existing fields ...

  room?: string;           // Which room this command belongs to
  keywords?: string[];     // For semantic discovery
}
```

### 2. Room-Aware Registry

```typescript
class CommandRegistry {
  private rooms = new Map<string, Room>();
  private commandsByRoom = new Map<string, Map<string, UniversalCommand>>();

  register(command: UniversalCommand): void {
    const roomId = command.schema.room || 'global';

    // Ensure room exists
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, createRoom(roomId));
    }

    // Add to room's tool map
    if (!this.commandsByRoom.has(roomId)) {
      this.commandsByRoom.set(roomId, new Map());
    }
    this.commandsByRoom.get(roomId)!.set(command.schema.name, command);
  }

  // O(1) lookup
  get(roomId: string, commandName: string): UniversalCommand | undefined {
    return this.commandsByRoom.get(roomId)?.get(commandName);
  }

  // Get all commands in a room
  getRoom(roomId: string): UniversalCommand[] {
    return Array.from(this.commandsByRoom.get(roomId)?.values() || []);
  }
}
```

### 3. RuntimeServer with Rooms

```typescript
class RuntimeServer {
  private loadedRooms = new Set<string>(['global']);

  loadRoom(roomId: string): void {
    this.loadedRooms.add(roomId);
  }

  unloadRoom(roomId: string): void {
    if (roomId !== 'global') {
      this.loadedRooms.delete(roomId);
    }
  }

  async startMCP(config: RuntimeMCPConfig): Promise<void> {
    // ... setup ...

    // tools/list only returns loaded rooms' tools
    this.mcpServer.setRequestHandler('tools/list', async () => {
      const tools: any[] = [];
      for (const roomId of this.loadedRooms) {
        for (const cmd of this.registry.getRoom(roomId)) {
          tools.push({
            name: `${roomId}.${cmd.schema.name.replace(/ /g, '_')}`,
            description: cmd.schema.description,
            inputSchema: cmd['parametersToJSONSchema']()
          });
        }
      }
      return { tools };
    });

    // Add load_room meta-tool
    // ...
  }
}
```

## Summary

### Key Design Decisions

1. **Rooms are first-class** - Not just a filter, but a data structure
2. **O(1) lookup** - Map-based, not array-filter
3. **Progressive loading** - AI requests rooms as needed
4. **Semantic discovery** - Keywords + optional embeddings
5. **Hierarchy support** - Nested rooms for complex domains
6. **Global room** - Always loaded, always available
7. **Aligned with @supernal/interface** - Same mental model as containers

### Benefits

- **Reduced token usage** - Only loaded rooms' tools sent to AI
- **Better AI decisions** - Focused tool set, less confusion
- **Faster lookups** - O(1) instead of O(n)
- **Cleaner organization** - Semantic grouping by domain
- **Unified pattern** - Same model for both packages
