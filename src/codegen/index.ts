/**
 * Code generation utilities for Universal Command
 *
 * This module provides backward-compatible exports that use the new
 * plugin-based generator system internally.
 */

import { CommandRegistry } from '../CommandRegistry';
import { nodeRequire } from '../nodeRequire';

export interface GenerateOptions {
  outputDir: string;
  typescript?: boolean;
}

// NOTE: do NOT `import { createRequire } from 'node:module'` at module top level.
// tsup/esbuild hoists that into a top-level `import 'module'` in the ESM bundle,
// which is Node-only and breaks the browser/client bundle the moment a client
// component pulls in the dashboard SDK barrel (which value-imports these classes).
// The bare `require(...)` calls below are rewritten by esbuild to its built-in,
// browser-safe `__require` shim (guards on `typeof require`), so they only run
// server-side (CLI/API) and never emit a static `import 'module'`. This is the
// proven fix for the recurring "Can't resolve 'module'" regression. See nodeRequire.ts.

/**
 * Generate CLI program from registry
 */
export function generateCLIProgram(registry: CommandRegistry): any {
  let Command: any;
  try {
    Command = nodeRequire('commander').Command;
  } catch {
    throw new Error('commander package is required. Install with: npm install commander');
  }

  const program = new Command();
  for (const cmd of registry.getAll()) {
    program.addCommand(cmd.toCLI());
  }
  return program;
}

// Re-export generator utilities
export { generate, generatorRegistry } from '../generators';
