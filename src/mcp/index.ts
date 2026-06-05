/**
 * MCP-specific utilities for Universal Command
 *
 * Creates a fully-wired MCP server from a CommandRegistry.
 * Uses ESM dynamic import for the SDK so this module works in both CJS and ESM.
 */

import { CommandRegistry } from '../CommandRegistry.js';

/**
 * Create an MCP server from a CommandRegistry.
 * Returns the server instance — call `server.connect(transport)` to start.
 *
 * @example
 * const registry = new CommandRegistry();
 * registry.register(myCommand);
 * const server = await createMCPServer(registry, { name: 'my-server', version: '0.1.0' });
 * const transport = new StdioServerTransport();
 * await server.connect(transport);
 */
export async function createMCPServer(
  registry: CommandRegistry,
  config: { name: string; version: string }
) {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { ListToolsRequestSchema, CallToolRequestSchema } =
    await import('@modelcontextprotocol/sdk/types.js');

  const server = new Server(
    { name: config.name, version: config.version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.getAll().map((cmd) => {
      const t = cmd.toMCP();
      return { name: t.name, description: t.description, inputSchema: t.inputSchema };
    }),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const command = registry.findByMCPName(name);
    if (!command) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      const result = await command.toMCP().execute(args ?? {});
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Create an Express app wired for HTTP/SSE MCP transport.
 *
 * Each POST /mcp request gets its own stateless transport instance (stateless mode,
 * sessionIdGenerator: undefined). Compatible with Claude's custom connector format.
 *
 * Also exposes GET /health → { status: 'ok', name, version } for liveness checks.
 *
 * Returns the Express app (so callers can add routes) and a `start(port)` convenience
 * method that begins listening and resolves when the server is ready.
 *
 * Works with any CommandRegistry — the whole supernal system or any individual board.
 *
 * @example
 * const { app, start } = await createMCPHttpApp(registry, { name: 'my-server', version: '0.1.0' });
 * await start(); // listens on port 3001 by default
 *
 * // Or bring your own port:
 * await start(4000);
 */
export async function createMCPHttpApp(
  registry: CommandRegistry,
  config: { name: string; version: string },
  options?: { port?: number }
): Promise<{ app: unknown; start: (port?: number) => Promise<void> }> {
  const express = await import('express').then((m) => m.default ?? m);
  const cors = await import('cors').then((m) => m.default ?? m);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expressApp: any = express();
  expressApp.use(cors());
  expressApp.use(express.json());

  // Health endpoint — verifies the server is alive without MCP client tooling
  expressApp.get('/health', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: 'ok', name: config.name, version: config.version });
  });

  // MCP endpoint — stateless: one transport per request
  expressApp.post('/mcp', async (req: unknown, res: unknown) => {
    const { StreamableHTTPServerTransport } =
      await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = await createMCPServer(registry, config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).on('close', () => transport.close());
    await server.connect(transport);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await transport.handleRequest(req as any, res as any, (req as any).body);
  });

  const defaultPort = options?.port ?? 3001;

  const start = (port?: number): Promise<void> => {
    const listenPort = port ?? defaultPort;
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = expressApp.listen(listenPort, (err?: any) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(
          `[mcp-http] ${config.name}@${config.version} listening on http://localhost:${listenPort}/mcp`
        );
        console.log(`[mcp-http] health: http://localhost:${listenPort}/health`);
        resolve();
      });
      srv.on('error', reject);
    });
  };

  return { app: expressApp, start };
}
