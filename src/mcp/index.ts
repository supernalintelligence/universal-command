/**
 * MCP-specific utilities for Universal Command
 */

import { CommandRegistry } from '../CommandRegistry';

/**
 * Create an MCP server from a CommandRegistry
 */
export function createMCPServer(registry: CommandRegistry, config: {
  name: string;
  version: string;
}): any {
  // Lazy load MCP SDK
  let Server: any;
  try {
    Server = require('@modelcontextprotocol/sdk/server').Server;
  } catch {
    throw new Error(
      '@modelcontextprotocol/sdk package is required. Install with: npm install @modelcontextprotocol/sdk'
    );
  }

  const server = new Server(
    {
      name: config.name,
      version: config.version
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register tools/list handler
  server.setRequestHandler('tools/list', async () => {
    const tools = registry.getAll().map(cmd => cmd.toMCP());
    return { tools };
  });

  // Register tools/call handler
  server.setRequestHandler('tools/call', async (request: any) => {
    const { name, arguments: args } = request.params;

    const command = registry.findByMCPName(name);
    if (!command) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await command.toMCP().execute(args);
  });

  return server;
}
