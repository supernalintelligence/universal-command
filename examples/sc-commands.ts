/**
 * Example: SC Commands with Runtime Registration
 *
 * This shows how SC could gradually migrate to universal-command
 * with runtime registration (no code generation step).
 *
 * Pattern:
 *   Define Command → Register → Serve as CLI + API + MCP
 *
 * Both CLI and MCP use the SAME handler - no drift possible.
 *
 * Scope-Based Architecture:
 *   Commands are organized into semantic "scopes" (namespaces).
 *   Only loaded scopes' tools are exposed to AI via MCP.
 *   AI can use load_scope/unload_scope meta-tools to manage context.
 */

import {
  UniversalCommand,
  createRuntimeServer,
  type CommandSchema,
  type Scope
} from '@supernal/universal-command';

// ============================================================================
// 1. Define Scopes (semantic groupings for progressive tool loading)
// ============================================================================

/**
 * Scope definitions for SC commands
 * These group related tools and enable O(1) lookup
 */
export const requirementScope: Scope = {
  id: 'requirement',
  name: 'Requirement Management',
  description: 'Tools for managing project requirements and specifications',
  keywords: ['requirement', 'req', 'spec', 'feature', 'user story'],
  requiredStates: ['project-loaded']
};

export const gitScope: Scope = {
  id: 'git',
  name: 'Git Operations',
  description: 'Version control and repository management',
  keywords: ['git', 'commit', 'branch', 'merge', 'push', 'pull']
};

export const deployScope: Scope = {
  id: 'deploy',
  name: 'Deployment',
  description: 'Build and deployment tools',
  keywords: ['deploy', 'build', 'release', 'ci', 'cd'],
  requiredStates: ['project-loaded', 'ci-configured']
};

// ============================================================================
// 2. Define Commands (these would live in supernal-code-package/src/commands/)
// ============================================================================

/**
 * sc requirement list
 */
export const requirementList = new UniversalCommand({
  name: 'requirement list',
  description: 'List requirements in the current project',
  category: 'requirements',
  scope: 'requirement',  // Belongs to requirement scope
  keywords: ['list', 'show', 'all'],

  input: {
    parameters: [
      {
        name: 'status',
        type: 'string',
        description: 'Filter by status',
        enum: ['draft', 'approved', 'implemented', 'tested']
      },
      {
        name: 'format',
        type: 'string',
        description: 'Output format',
        default: 'table',
        enum: ['table', 'json', 'markdown']
      },
      {
        name: 'limit',
        type: 'number',
        description: 'Maximum number of results',
        default: 50,
        min: 1,
        max: 500
      }
    ]
  },

  output: { type: 'json' },

  handler: async (args, context) => {
    // This is the SINGLE implementation used by CLI, API, and MCP
    // In real SC, this would call RequirementManager.list()

    const requirements = [
      { id: 'REQ-001', title: 'User authentication', status: 'approved' },
      { id: 'REQ-002', title: 'Dashboard analytics', status: 'draft' },
      { id: 'REQ-003', title: 'Export functionality', status: 'implemented' }
    ];

    let filtered = requirements;
    if (args.status) {
      filtered = filtered.filter(r => r.status === args.status);
    }

    return {
      requirements: filtered.slice(0, args.limit),
      total: filtered.length,
      format: args.format
    };
  },

  // CLI-specific: custom table formatting
  cli: {
    aliases: ['req', 'reqs'],
    format: (result) => {
      if (result.format === 'json') {
        return JSON.stringify(result.requirements, null, 2);
      }
      // Table format
      const header = 'ID\t\tTitle\t\t\t\tStatus';
      const rows = result.requirements
        .map((r: any) => `${r.id}\t\t${r.title.padEnd(24)}\t${r.status}`)
        .join('\n');
      return `${header}\n${'-'.repeat(60)}\n${rows}\n\nTotal: ${result.total}`;
    }
  },

  // API-specific: caching
  api: {
    method: 'GET',
    cacheControl: { maxAge: 60 }
  },

  // MCP-specific: tool name
  mcp: {
    toolName: 'sc_requirement_list'
  }
});

/**
 * sc requirement create
 */
export const requirementCreate = new UniversalCommand({
  name: 'requirement create',
  description: 'Create a new requirement',
  category: 'requirements',
  scope: 'requirement',  // Belongs to requirement scope
  keywords: ['create', 'add', 'new'],

  input: {
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Requirement title',
        required: true
      },
      {
        name: 'description',
        type: 'string',
        description: 'Detailed description'
      },
      {
        name: 'priority',
        type: 'string',
        description: 'Priority level',
        default: 'medium',
        enum: ['low', 'medium', 'high', 'critical']
      },
      {
        name: 'assignee',
        type: 'string',
        description: 'Assigned team member'
      }
    ]
  },

  output: { type: 'json' },

  handler: async (args, context) => {
    // Single implementation for CLI, API, MCP
    const requirement = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      title: args.title,
      description: args.description || '',
      priority: args.priority,
      assignee: args.assignee,
      status: 'draft',
      createdAt: new Date().toISOString()
    };

    // In real SC: await RequirementManager.create(requirement)

    return {
      success: true,
      requirement,
      message: `Created requirement ${requirement.id}`
    };
  },

  api: { method: 'POST' },
  mcp: { toolName: 'sc_requirement_create' }
});

/**
 * sc health check
 * This is a global command (no scope) - always available
 */
export const healthCheck = new UniversalCommand({
  name: 'health check',
  description: 'Check project health status',
  category: 'system',
  // No scope specified = global scope (always available)
  keywords: ['health', 'status', 'check'],

  input: {
    parameters: [
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Show detailed output',
        default: false
      }
    ]
  },

  output: { type: 'json' },

  handler: async (args, context) => {
    const checks = {
      git: { status: 'ok', message: 'Git repository initialized' },
      config: { status: 'ok', message: 'supernal.yaml found' },
      dependencies: { status: 'ok', message: 'All dependencies installed' },
      tests: { status: 'warning', message: '3 tests skipped' }
    };

    const overall = Object.values(checks).every(c => c.status === 'ok')
      ? 'healthy'
      : 'needs attention';

    if (args.verbose) {
      return { overall, checks };
    }

    return { overall, summary: `${Object.keys(checks).length} checks completed` };
  },

  cli: {
    aliases: ['hc'],
    format: (result) => {
      if (result.checks) {
        const lines = Object.entries(result.checks)
          .map(([name, check]: [string, any]) =>
            `${check.status === 'ok' ? '✓' : '⚠'} ${name}: ${check.message}`
          );
        return `Project Health: ${result.overall}\n\n${lines.join('\n')}`;
      }
      return `Project Health: ${result.overall} (${result.summary})`;
    }
  },

  mcp: { toolName: 'sc_health_check' }
});

// ============================================================================
// 3. Runtime Server Setup
// ============================================================================

/**
 * Create the SC runtime server
 * This serves CLI, API, and MCP from the same command definitions
 *
 * Scope-based features:
 * - Commands are auto-grouped by their scope field
 * - Only loaded scopes' tools are exposed to MCP
 * - AI can use load_scope/unload_scope to manage context
 */
export function createSCServer() {
  const server = createRuntimeServer();

  // Register scope definitions (for metadata/discovery)
  server.registerScope(requirementScope);
  server.registerScope(gitScope);
  server.registerScope(deployScope);

  // Register all commands (auto-assigned to scopes based on schema.scope)
  server.register(requirementList);
  server.register(requirementCreate);
  server.register(healthCheck);

  // Enable scope-based tool loading
  server.enableScopes();

  return server;
}

// ============================================================================
// 4. Usage Examples
// ============================================================================

// --- CLI Usage (in bin/sc.ts) ---
/*
import { Command } from 'commander';
import { createSCServer } from './sc-commands';

const server = createSCServer();
const program = new Command('sc');

// Add all commands to CLI
for (const cmd of server.getRegistry().getAll()) {
  program.addCommand(cmd.toCLI());
}

program.parse();
*/

// --- Next.js API Usage (in app/api/[...path]/route.ts) ---
/*
import { createSCServer } from '@/lib/sc-commands';

const server = createSCServer();
const handlers = server.getNextHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
*/

// --- MCP Server Usage (in mcp-server.ts) ---
/*
import { createSCServer } from './sc-commands';

const server = createSCServer();

// Start MCP server with scope-based tool loading
// AI can use load_scope/unload_scope tools to manage context
await server.startMCP({
  name: 'sc-mcp-server',
  version: '1.0.0',
  transport: 'stdio',
  useScopes: true,           // Enable scope-based loading
  enableScopeLoading: true   // Add load_scope/unload_scope meta-tools
});

// Example MCP interaction:
// 1. AI: tools/list → [health_check, load_scope, unload_scope, list_scopes]
// 2. AI: load_scope { scope: 'requirement' }
// 3. AI: tools/list → [health_check, requirement_list, requirement_create, ...]
*/

// --- Express Usage (alternative to Next.js) ---
/*
import express from 'express';
import { createSCServer } from './sc-commands';

const app = express();
const server = createSCServer();

app.use('/api', server.getExpressRouter());
app.listen(3000);
*/

// ============================================================================
// 5. List Registered Commands
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createSCServer();
  const scopeRegistry = server.getScopeRegistry();

  console.log('SC Commands (Runtime Registration with Scopes):\n');

  // Show scopes
  console.log('Scopes:');
  for (const scope of scopeRegistry.getAllScopes()) {
    const loaded = scopeRegistry.isLoaded(scope.id) ? '✓' : ' ';
    const toolCount = scopeRegistry.getCommandsInScope(scope.id).length;
    console.log(`  [${loaded}] ${scope.id.padEnd(15)} ${scope.name} (${toolCount} tools)`);
  }

  console.log('\nCommands:');
  console.log('Scope           Command                API Path                    MCP Tool');
  console.log('-'.repeat(90));

  for (const info of server.listCommands()) {
    const cmd = server.getRegistry().get(info.name);
    const scope = cmd?.schema.scope || 'global';
    console.log(
      `${scope.padEnd(15)} ${info.name.padEnd(22)} ${info.apiPath.padEnd(27)} ${info.mcpTool}`
    );
  }

  console.log('\nTotal:', server.getRegistry().size, 'commands registered');
  console.log('Scopes:', scopeRegistry.scopeCount, '| Loaded:', scopeRegistry.getLoadedScopeIds().join(', '));
}
