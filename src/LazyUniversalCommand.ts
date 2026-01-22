/**
 * LazyUniversalCommand - P0-3: Lazy Loading
 *
 * Lazy-loads command handler only when needed, reducing startup time.
 * Research shows this can provide 8x performance improvement for CLIs with many commands.
 *
 * Pattern:
 * - Store handler path instead of actual handler function
 * - Load handler on first execution
 * - Cache handler after first load
 *
 * Source: Josh Bavari's blog, Alex Ramsdell's blog on lazy CLI loading
 */

import type {
  CommandSchema,
  ExecutionContext,
  
  MCPToolDefinition,
  NextAPIRoute,
} from './types';
import { UniversalCommand } from './UniversalCommand';
import { ValidationError } from './errors';

/**
 * Lazy command schema where handler is a path to load, not actual function
 */
export interface LazyCommandSchema<TInput = any, TOutput = any>
  extends Omit<CommandSchema<TInput, TOutput>, 'handler'> {
  /**
   * Path to module containing handler (for lazy loading)
   * Example: './commands/git/commit' or '@/commands/deploy'
   */
  handlerPath: string;

  /**
   * Export name from module (default: 'handler')
   * Example: { handlerPath: './commands/git', handlerExport: 'commitHandler' }
   */
  handlerExport?: string;

  /**
   * Optional: Pre-loaded handler (used after lazy load or for testing)
   */
  handler?: (args: TInput, context: ExecutionContext) => Promise<TOutput>;
}

/**
 * LazyUniversalCommand loads handler on-demand for faster startup
 *
 * Usage:
 * ```typescript
 * const command = new LazyUniversalCommand({
 *   name: 'deploy',
 *   description: 'Deploy application',
 *   handlerPath: './commands/deploy',
 *   input: { parameters: [...] },
 *   output: { type: 'json' }
 * });
 *
 * // Handler NOT loaded yet - fast!
 * const cli = command.toCLI();
 *
 * // Handler loaded only when command executes
 * await command.execute({ environment: 'prod' }, context);
 * ```
 */
export class LazyUniversalCommand<TInput = any, TOutput = any> extends UniversalCommand<
  TInput,
  TOutput
> {
  private handlerPath: string;
  private handlerExport: string;
  private handlerLoaded = false;
  private loadError?: Error;

  constructor(public readonly lazySchema: LazyCommandSchema<TInput, TOutput>) {
    // Create schema with stub handler for parent class
    const schema: CommandSchema<TInput, TOutput> = {
      ...lazySchema,
      handler: lazySchema.handler || (async () => {
        throw new Error('Handler not loaded yet');
      }),
    };

    super(schema);

    this.handlerPath = lazySchema.handlerPath;
    this.handlerExport = lazySchema.handlerExport || 'handler';
  }

  /**
   * Get metadata without loading handler (for fast help generation)
   * Returns all schema info except handler
   */
  getMetadata() {
    return {
      name: this.schema.name,
      description: this.schema.description,
      category: this.schema.category,
      scope: this.schema.scope,
      keywords: this.schema.keywords,
      input: this.schema.input,
      output: {
        type: this.schema.output.type,
        schema: this.schema.output.schema,
      },
      cli: this.schema.cli,
      api: this.schema.api,
      mcp: this.schema.mcp,
    };
  }

  /**
   * Load handler from module (cached after first load)
   */
  private async loadHandler(): Promise<void> {
    if (this.handlerLoaded) return;
    if (this.loadError) throw this.loadError;

    try {
      // Try dynamic import first (ESM), fall back to require (CJS)
      let module: any;
      try {
        // Use dynamic import for ESM
        module = await import(this.handlerPath);
      } catch (importError: any) {
        // Fall back to require for CJS
        try {
          module = require(this.handlerPath);
        } catch (requireError: any) {
          throw new Error(
            `Cannot load module: ${importError.message}. ` +
              `Also tried require: ${requireError.message}`
          );
        }
      }

      // Get handler from export
      const handler = module[this.handlerExport];

      if (!handler || typeof handler !== 'function') {
        throw new Error(
          `Handler not found: ${this.handlerExport} in ${this.handlerPath}. ` +
            `Available exports: ${Object.keys(module).join(', ')}`
        );
      }

      // Update schema with loaded handler
      (this.schema as any).handler = handler;
      this.handlerLoaded = true;
    } catch (error: any) {
      this.loadError = new Error(`Failed to load handler from ${this.handlerPath}: ${error.message}`);
      throw this.loadError;
    }
  }

  /**
   * Execute command (loads handler on first call)
   */
  override async execute(args: TInput, context: ExecutionContext): Promise<TOutput> {
    // Validate BEFORE loading handler (fail fast!)
    const validation = this.validateArgs(args);
    if (!validation.valid) {
      throw new ValidationError(
        'Invalid command arguments',
        validation.errors || []
      );
    }

    // Lazy load handler AFTER validation
    await this.loadHandler();

    // Execute handler with validated args
    return await (this.schema as any).handler(validation.data as TInput, context);
  }

  /**
   * Check if handler is loaded
   */
  isHandlerLoaded(): boolean {
    return this.handlerLoaded;
  }

  /**
   * Force preload handler (useful for testing or warming up)
   */
  async preload(): Promise<void> {
    await this.loadHandler();
  }

  /**
   * Generate CLI command (NO handler loading - fast!)
   * Handler loads only when command is actually executed
   */
  override toCLI(): any {
    // Use parent's toCLI without loading handler
    // This is the key to fast startup - no require() calls during CLI setup
    return super.toCLI();
  }

  /**
   * Generate Next.js API route (loads handler on first request)
   */
  override toNextAPI(): NextAPIRoute {
    const method = this.schema.api?.method || 'GET';

    const handler = async (request: any, context?: any) => {
      // Lazy load handler on first API request
      await this.loadHandler();

      // Execute using parent class
      return super.toNextAPI()[method as keyof NextAPIRoute]!(request, context);
    };

    return { [method]: handler } as NextAPIRoute;
  }

  /**
   * Generate MCP tool (loads handler on first call)
   */
  override toMCP(): MCPToolDefinition {
    const baseMCP = super.toMCP();

    return {
      ...baseMCP,
      execute: async (args: any) => {
        // Lazy load handler on first MCP call
        await this.loadHandler();

        // Execute using parent class
        return baseMCP.execute(args);
      },
    };
  }
}

/**
 * Create lazy command from schema
 */
export function lazyCommand<TInput = any, TOutput = any>(
  schema: LazyCommandSchema<TInput, TOutput>
): LazyUniversalCommand<TInput, TOutput> {
  return new LazyUniversalCommand(schema);
}

/**
 * Performance utilities for lazy loading
 */
export class LazyCommandPerformance {
  private static loadTimes: Map<string, number> = new Map();
  private static loadCounts: Map<string, number> = new Map();

  /**
   * Track handler load time
   */
  static trackLoad(commandName: string, duration: number): void {
    this.loadTimes.set(commandName, duration);
    this.loadCounts.set(commandName, (this.loadCounts.get(commandName) || 0) + 1);
  }

  /**
   * Get load statistics
   */
  static getStats() {
    const stats: Array<{ command: string; loadTime: number; loadCount: number }> = [];

    for (const [command, loadTime] of this.loadTimes.entries()) {
      stats.push({
        command,
        loadTime,
        loadCount: this.loadCounts.get(command) || 0,
      });
    }

    return stats.sort((a, b) => b.loadTime - a.loadTime);
  }

  /**
   * Get total load time saved by lazy loading
   */
  static getTotalSaved(): number {
    let total = 0;
    for (const loadTime of this.loadTimes.values()) {
      total += loadTime;
    }
    return total;
  }

  /**
   * Reset statistics
   */
  static reset(): void {
    this.loadTimes.clear();
    this.loadCounts.clear();
  }
}
