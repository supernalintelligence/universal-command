/**
 * Example: User management commands with UniversalCommand
 */

import { UniversalCommand, CommandRegistry } from '@supernal/universal-command';

// ============================================================================
// 1. Define Commands
// ============================================================================

/**
 * Command: List users
 */
export const userList = new UniversalCommand({
  name: 'user list',
  description: 'List all users',
  category: 'users',
  
  input: {
    parameters: [
      {
        name: 'role',
        type: 'string',
        description: 'Filter by role',
        enum: ['user', 'admin', 'moderator']
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of results',
        default: 10,
        min: 1,
        max: 100
      }
    ]
  },
  
  output: {
    type: 'json',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' }
        }
      }
    }
  },
  
  handler: async (args, context) => {
    // Mock implementation - replace with real DB query
    const users = [
      { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' },
      { id: '3', name: 'Carol', email: 'carol@example.com', role: 'moderator' }
    ];
    
    let filtered = users;
    
    if (args.role) {
      filtered = filtered.filter(u => u.role === args.role);
    }
    
    return filtered.slice(0, args.limit);
  },
  
  // CLI-specific formatting
  cli: {
    format: (users) => {
      return users
        .map(u => `${u.id.padEnd(5)} ${u.name.padEnd(20)} ${u.email.padEnd(30)} ${u.role}`)
        .join('\n');
    }
  },
  
  // API-specific caching
  api: {
    cacheControl: {
      maxAge: 60, // Cache for 1 minute
      staleWhileRevalidate: 30
    }
  }
});

/**
 * Command: Create user
 */
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
        required: true
      },
      {
        name: 'email',
        type: 'string',
        description: 'User email',
        required: true,
        pattern: '^[^@]+@[^@]+\\.[^@]+$'
      },
      {
        name: 'role',
        type: 'string',
        description: 'User role',
        default: 'user',
        enum: ['user', 'admin', 'moderator']
      }
    ]
  },
  
  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' }
      }
    }
  },
  
  handler: async (args, context) => {
    // Mock implementation - replace with real DB insert
    const user = {
      id: `user-${Date.now()}`,
      name: args.name,
      email: args.email,
      role: args.role
    };
    
    console.log('Created user:', user);
    
    return user;
  },
  
  // API uses POST method
  api: {
    method: 'POST'
  }
});

// ============================================================================
// 2. Register Commands
// ============================================================================

export const registry = new CommandRegistry();
registry.register(userList);
registry.register(userCreate);

// ============================================================================
// 3. Generate CLI
// ============================================================================

// cli.ts
/*
import { Command } from 'commander';
import { registry } from './commands';

const program = new Command();

for (const cmd of registry.getAll()) {
  program.addCommand(cmd.toCLI());
}

program.parse();
*/

// Usage:
// $ mycli user list --role admin --limit 5
// $ mycli user create --name "Alice" --email "alice@example.com" --role admin

// ============================================================================
// 4. Generate API Routes
// ============================================================================

// app/api/user/list/route.ts
/*
import { userList } from '@/commands/user-list';

export const GET = userList.toNextAPI().GET;
*/

// Usage:
// GET /api/user/list?role=admin&limit=5
// POST /api/user/create { "name": "Alice", "email": "alice@example.com" }

// ============================================================================
// 5. Generate MCP Server
// ============================================================================

// mcp-server.ts
/*
import { createMCPServer } from '@supernal/universal-command/mcp';
import { registry } from './commands';

const server = createMCPServer(registry, {
  name: 'my-mcp-server',
  version: '1.0.0'
});

server.connect(transport);
*/

// Available MCP tools:
// - sc_user_list
// - sc_user_create
