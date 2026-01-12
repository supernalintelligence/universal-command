/**
 * Generator Plugin System for Universal Command
 *
 * Provides extensible code generation from UniversalCommand definitions.
 */

// Types
export * from './types';

// Registry
export { GeneratorRegistry, generatorRegistry } from './registry';

// Built-in plugins
export { NextRoutesGenerator, type NextRoutesOptions } from './plugins/next-routes';
export { MCPServerGenerator, type MCPServerOptions } from './plugins/mcp-server';
export { OpenAPIGenerator, type OpenAPIOptions } from './plugins/openapi';

// Pre-register built-in generators
import { generatorRegistry } from './registry';
import { NextRoutesGenerator } from './plugins/next-routes';
import { MCPServerGenerator } from './plugins/mcp-server';
import { OpenAPIGenerator } from './plugins/openapi';

generatorRegistry.register(new NextRoutesGenerator());
generatorRegistry.register(new MCPServerGenerator());
generatorRegistry.register(new OpenAPIGenerator());

/**
 * Convenience function to generate using any registered generator
 */
export async function generate<TOptions, TResult>(
  generatorName: string,
  registry: import('../CommandRegistry').CommandRegistry,
  options: TOptions
): Promise<TResult> {
  const generator = generatorRegistry.get(generatorName);
  if (!generator) {
    throw new Error(
      `Generator "${generatorName}" not found. Available: ${
        generatorRegistry.getAll().map(g => g.name).join(', ')
      }`
    );
  }
  return generator.generate(registry, options) as Promise<TResult>;
}
