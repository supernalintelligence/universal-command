/**
 * Runtime Registration Module
 *
 * Enables direct registration of commands as live API routes and MCP tools
 * WITHOUT code generation. Commands are registered at runtime and served directly.
 *
 * Architecture:
 *   CommandSchema → Registry → Live API/MCP (no intermediate files)
 *
 * This is the "bottom-up" approach matching @supernal/interface's pattern:
 *   Definition → Registration → Runtime serving
 *
 * Scope-Based Architecture:
 *   Uses ScopeRegistry for O(1) keyed lookup instead of O(n) filtering.
 *   Scopes are semantic namespaces that can be loaded/unloaded.
 *   Only loaded scopes' tools are exposed to AI via MCP.
 */

import { CommandRegistry } from '../CommandRegistry';
import { ScopeRegistry } from '../scopes/ScopeRegistry';
import { UniversalCommand } from '../UniversalCommand';
import type { CommandSchema, Scope } from '../types';

/**
 * Runtime API server configuration
 */
export interface RuntimeAPIConfig {
  /** Base path for all routes (e.g., '/api') */
  basePath?: string;
  /** Port to listen on (if standalone) */
  port?: number;
  /** Enable CORS */
  cors?: boolean;
  /** Custom middleware */
  middleware?: Array<(req: any, res: any, next: () => void) => void>;
}

/**
 * Runtime MCP server configuration
 */
export interface RuntimeMCPConfig {
  /** Server name for MCP */
  name: string;
  /** Server version */
  version: string;
  /** Transport type */
  transport?: 'stdio' | 'http';
  /** Port for HTTP transport */
  port?: number;
  /** Use scope-based tool loading (default: true) */
  useScopes?: boolean;
  /** Enable load_scope meta-tool (default: true when useScopes is true) */
  enableScopeLoading?: boolean;
}

/**
 * Unified runtime server that serves both API and MCP from the same registry
 *
 * Supports two registry modes:
 * - CommandRegistry: Simple flat registry (legacy)
 * - ScopeRegistry: O(1) keyed lookup with scope-based loading (recommended)
 */
export class RuntimeServer {
  private registry: CommandRegistry;
  private scopeRegistry: ScopeRegistry;
  private useScopes: boolean;
  private apiConfig?: RuntimeAPIConfig;
  private mcpConfig?: RuntimeMCPConfig;
  private mcpServer?: any;
  private httpServer?: any;

  constructor(registry?: CommandRegistry | ScopeRegistry) {
    if (registry instanceof ScopeRegistry) {
      this.scopeRegistry = registry;
      this.registry = new CommandRegistry(); // Keep for compatibility
      this.useScopes = true;
    } else {
      this.registry = registry || new CommandRegistry();
      this.scopeRegistry = new ScopeRegistry();
      this.useScopes = false;
    }
  }

  /**
   * Register a command for runtime serving
   */
  register(command: UniversalCommand): this {
    this.registry.register(command);
    this.scopeRegistry.register(command);
    return this;
  }

  /**
   * Register multiple commands
   */
  registerAll(commands: UniversalCommand[]): this {
    for (const cmd of commands) {
      this.register(cmd);
    }
    return this;
  }

  /**
   * Create command from schema and register it
   */
  command<TInput = any, TOutput = any>(schema: CommandSchema<TInput, TOutput>): UniversalCommand<TInput, TOutput> {
    const cmd = new UniversalCommand(schema);
    this.register(cmd);
    return cmd;
  }

  /**
   * Get the underlying registry (flat)
   */
  getRegistry(): CommandRegistry {
    return this.registry;
  }

  /**
   * Get the scope-based registry
   */
  getScopeRegistry(): ScopeRegistry {
    return this.scopeRegistry;
  }

  /**
   * Register a scope definition
   */
  registerScope(scope: Scope): this {
    this.scopeRegistry.registerScope(scope);
    return this;
  }

  /**
   * Load a scope (makes its tools available to MCP)
   */
  loadScope(scopeId: string, options?: { includeChildren?: boolean }): this {
    this.scopeRegistry.loadScope(scopeId, options);
    return this;
  }

  /**
   * Unload a scope (removes its tools from MCP)
   */
  unloadScope(scopeId: string): this {
    this.scopeRegistry.unloadScope(scopeId);
    return this;
  }

  /**
   * Enable scope-based tool loading
   */
  enableScopes(): this {
    this.useScopes = true;
    return this;
  }

  /**
   * Configure and start MCP server
   *
   * When useScopes is enabled (default), only loaded scopes' tools are exposed.
   * AI can use load_scope meta-tool to load additional scopes.
   */
  async startMCP(config: RuntimeMCPConfig): Promise<void> {
    this.mcpConfig = config;
    const useScopes = config.useScopes !== false && this.useScopes;
    const enableScopeLoading = config.enableScopeLoading !== false && useScopes;

    // Lazy load MCP SDK using require for flexibility
    // Note: Explicit .js extension required due to SDK's ESM module type
    let Server: any;
    let StdioServerTransport: any;
    let ListToolsRequestSchema: any;
    let CallToolRequestSchema: any;
    let ListResourcesRequestSchema: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serverModule = require('@modelcontextprotocol/sdk/server/index.js');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const stdioModule = require('@modelcontextprotocol/sdk/server/stdio.js');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const typesModule = require('@modelcontextprotocol/sdk/types.js');
      Server = serverModule.Server;
      StdioServerTransport = stdioModule.StdioServerTransport;
      ListToolsRequestSchema = typesModule.ListToolsRequestSchema;
      CallToolRequestSchema = typesModule.CallToolRequestSchema;
      ListResourcesRequestSchema = typesModule.ListResourcesRequestSchema;
    } catch (e: any) {
      throw new Error(
        `@modelcontextprotocol/sdk package is required. Install with: npm install @modelcontextprotocol/sdk. Error: ${e.message}`
      );
    }

    this.mcpServer = new Server(
      {
        name: config.name,
        version: config.version
      },
      {
        capabilities: {
          tools: {},
          resources: useScopes ? {} : undefined
        }
      }
    );

    // Register resources/list handler for scope discovery (when using scopes)
    if (useScopes) {
      this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
        const scopes = this.scopeRegistry.getAllScopes().map(scope => ({
          uri: `scope://${scope.id}`,
          name: scope.name,
          description: scope.description,
          mimeType: 'application/json'
        }));
        return { resources: scopes };
      });
    }

    // Register tools/list handler
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      // Get commands based on mode
      const commands = useScopes
        ? this.scopeRegistry.getLoadedCommands()
        : this.registry.getAll();

      const tools = commands.map(cmd => ({
        name: cmd.getMCPToolName(),
        description: cmd.schema.description,
        inputSchema: cmd['parametersToJSONSchema']()
      }));

      // Add scope management meta-tools if enabled
      if (enableScopeLoading) {
        tools.push({
          name: 'load_scope',
          description: 'Load a scope to access its tools. Use resources/list to see available scopes.',
          inputSchema: {
            type: 'object',
            properties: {
              scope: {
                type: 'string',
                description: 'Scope ID to load (e.g., "requirement", "git", "deploy")'
              },
              includeChildren: {
                type: 'boolean',
                description: 'Also load child scopes',
                default: false
              }
            },
            required: ['scope']
          }
        });
        tools.push({
          name: 'unload_scope',
          description: 'Unload a scope to reduce available tools',
          inputSchema: {
            type: 'object',
            properties: {
              scope: {
                type: 'string',
                description: 'Scope ID to unload'
              }
            },
            required: ['scope']
          }
        });
        tools.push({
          name: 'list_scopes',
          description: 'List all available scopes and their load status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        });
      }

      return { tools };
    });

    // Register tools/call handler
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      // Handle scope management meta-tools
      if (enableScopeLoading) {
        if (name === 'load_scope') {
          const scopeId = args.scope;
          try {
            this.scopeRegistry.loadScope(scopeId, { includeChildren: args.includeChildren });
            const loadedCount = this.scopeRegistry.getCommandsInScope(scopeId).length;
            return {
              content: [{
                type: 'text',
                text: `Loaded scope "${scopeId}" with ${loadedCount} tools. Use tools/list to see updated tool list.`
              }]
            };
          } catch (error: any) {
            return {
              content: [{
                type: 'text',
                text: `Failed to load scope: ${error.message}`
              }],
              isError: true
            };
          }
        }

        if (name === 'unload_scope') {
          const scopeId = args.scope;
          this.scopeRegistry.unloadScope(scopeId);
          return {
            content: [{
              type: 'text',
              text: `Unloaded scope "${scopeId}". Use tools/list to see updated tool list.`
            }]
          };
        }

        if (name === 'list_scopes') {
          const scopes = this.scopeRegistry.getAllScopes().map(scope => ({
            id: scope.id,
            name: scope.name,
            description: scope.description,
            loaded: this.scopeRegistry.isLoaded(scope.id),
            toolCount: this.scopeRegistry.getCommandsInScope(scope.id).length,
            keywords: scope.keywords
          }));
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(scopes, null, 2)
            }]
          };
        }
      }

      // Find command using appropriate registry
      const command = useScopes
        ? this.scopeRegistry.findByMCPName(name)
        : this.registry.findByMCPName(name);

      if (!command) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await command.toMCP().execute(args);
    });

    // Connect transport
    if (config.transport === 'stdio' || !config.transport) {
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);
    }
    // HTTP transport would go here
  }

  /**
   * Get Next.js App Router handlers for all registered commands
   * Use this to create a catch-all route: app/api/[...path]/route.ts
   */
  getNextHandlers(): {
    GET: (request: any, context: any) => Promise<Response>;
    POST: (request: any, context: any) => Promise<Response>;
    PUT: (request: any, context: any) => Promise<Response>;
    DELETE: (request: any, context: any) => Promise<Response>;
    PATCH: (request: any, context: any) => Promise<Response>;
  } {
    const registry = this.registry;

    const handleRequest = async (request: any, context: any, method: string) => {
      // Extract path from URL
      const url = new URL(request.url);
      const pathParts = context?.params?.path || url.pathname.split('/').filter(Boolean);
      const commandPath = pathParts.join(' ');

      // Find command by API path
      const command = registry.findByAPIPath(commandPath) || registry.get(commandPath);

      if (!command) {
        return new Response(
          JSON.stringify({ error: `Command not found: ${commandPath}` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if command supports this method
      const expectedMethod = command.schema.api?.method || 'GET';
      if (method !== expectedMethod && !(method === 'GET' && !command.schema.api?.method)) {
        return new Response(
          JSON.stringify({ error: `Method ${method} not allowed for ${commandPath}` }),
          { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Execute via command's API handler
      const apiRoute = command.toNextAPI();
      const handler = apiRoute[method as keyof typeof apiRoute];

      if (!handler) {
        return new Response(
          JSON.stringify({ error: `No handler for ${method}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return handler(request, context);
    };

    return {
      GET: (req, ctx) => handleRequest(req, ctx, 'GET'),
      POST: (req, ctx) => handleRequest(req, ctx, 'POST'),
      PUT: (req, ctx) => handleRequest(req, ctx, 'PUT'),
      DELETE: (req, ctx) => handleRequest(req, ctx, 'DELETE'),
      PATCH: (req, ctx) => handleRequest(req, ctx, 'PATCH'),
    };
  }

  /**
   * Get Express.js router with all registered commands
   */
  getExpressRouter(): any {
    // Lazy load express
    let Router: any;
    try {
      Router = require('express').Router;
    } catch {
      throw new Error('express package is required. Install with: npm install express');
    }

    const router = Router();

    for (const command of this.registry.getAll()) {
      const path = '/' + command.getAPIRoutePath().replace(/ /g, '/');
      const method = (command.schema.api?.method || 'GET').toLowerCase();

      router[method](path, async (req: any, res: any) => {
        try {
          // Merge query, params, and body
          const args = {
            ...req.query,
            ...req.params,
            ...(req.body || {})
          };

          const result = await command.execute(args, {
            interface: 'api',
            request: req
          });

          res.json(result);
        } catch (error: any) {
          res.status(error.details?.status || 500).json({
            error: error.message,
            details: error.details
          });
        }
      });
    }

    return router;
  }

  /**
   * List all registered commands with their routes
   */
  listCommands(): Array<{
    name: string;
    description: string;
    apiPath: string;
    mcpTool: string;
    method: string;
  }> {
    return this.registry.getAll().map(cmd => ({
      name: cmd.schema.name,
      description: cmd.schema.description,
      apiPath: '/' + cmd.getAPIRoutePath().replace(/ /g, '/'),
      mcpTool: cmd.getMCPToolName(),
      method: cmd.schema.api?.method || 'GET'
    }));
  }
}

/**
 * Create a new runtime server instance
 */
export function createRuntimeServer(registry?: CommandRegistry): RuntimeServer {
  return new RuntimeServer(registry);
}

/**
 * Quick helper to create and register commands in one call
 */
export function defineCommands(
  schemas: CommandSchema[]
): { server: RuntimeServer; commands: UniversalCommand[] } {
  const server = new RuntimeServer();
  const commands = schemas.map(schema => server.command(schema));
  return { server, commands };
}
