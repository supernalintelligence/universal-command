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
