/**
 * Code generation utilities for Universal Command
 *
 * This module provides backward-compatible exports that use the new
 * plugin-based generator system internally.
 */

import { createRequire } from 'node:module';
import { CommandRegistry } from '../CommandRegistry';

// Create a require function that works in both ESM and CJS contexts
const require = createRequire(import.meta.url);
import {
  NextRoutesGenerator,
  MCPServerGenerator,
  type GeneratorResult
} from '../generators';

export interface GenerateOptions {
  outputDir: string;
  typescript?: boolean;
}

/**
 * Generate Next.js API routes from registry
 * @deprecated Use generators directly: generate('next-routes', registry, options)
 */
export async function generateNextRoutes(
  registry: CommandRegistry,
  options: GenerateOptions
): Promise<GeneratorResult> {
  const generator = new NextRoutesGenerator();
  return generator.generate(registry, options);
}

/**
 * Generate CLI program from registry
 */
export function generateCLIProgram(registry: CommandRegistry): any {
  let Command: any;
  try {
    Command = require('commander').Command;
  } catch {
    throw new Error('commander package is required. Install with: npm install commander');
  }

  const program = new Command();
  for (const cmd of registry.getAll()) {
    program.addCommand(cmd.toCLI());
  }
  return program;
}

/**
 * Generate MCP server file from registry
 * @deprecated Use generators directly: generate('mcp-server', registry, options)
 */
export async function generateMCPServer(
  registry: CommandRegistry,
  options: { outputPath: string; serverName?: string; serverVersion?: string }
): Promise<{ path: string; toolCount: number }> {
  const generator = new MCPServerGenerator();
  await generator.generate(registry, {
    outputPath: options.outputPath,
    serverName: options.serverName,
    serverVersion: options.serverVersion
  });

  return {
    path: options.outputPath,
    toolCount: registry.getAll().length
  };
}

// Re-export generator utilities
export { generate, generatorRegistry } from '../generators';
