/**
 * Core UniversalCommand class
 *
 * Defines a command once and generates CLI, API, and MCP interfaces automatically.
 */

import type {
  CommandSchema,
  ExecutionContext,
  ValidationResult,
  MCPToolDefinition,
  NextAPIRoute,
  Parameter,
} from './types';
import { ValidationError } from './errors';

export class UniversalCommand<TInput = any, TOutput = any> {
  constructor(public readonly schema: CommandSchema<TInput, TOutput>) {
    this.validateSchema();
  }

  /**
   * Validate the command schema is well-formed
   */
  private validateSchema(): void {
    if (!this.schema.name) {
      throw new Error('Command name is required');
    }
    if (!this.schema.description) {
      throw new Error('Command description is required');
    }
    if (!this.schema.handler) {
      throw new Error('Command handler is required');
    }
  }

  /**
   * Execute the command with given arguments and context
   */
  async execute(args: TInput, context: ExecutionContext): Promise<TOutput> {
    // Validate input
    const validation = this.validateArgs(args);
    if (!validation.valid) {
      throw new ValidationError('Invalid command arguments', validation.errors || []);
    }

    // Execute handler
    return await this.schema.handler(validation.data as TInput, context);
  }

  /**
   * Validate arguments against parameter schema
   */
  validateArgs(args: unknown): ValidationResult<TInput> {
    const errors: Array<{ path: string; message: string }> = [];
    const data: any = {};

    for (const param of this.schema.input.parameters) {
      const value = (args as any)?.[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        errors.push({
          path: param.name,
          message: `Parameter '${param.name}' is required`,
        });
        continue;
      }

      // Use default if not provided
      if (value === undefined && param.default !== undefined) {
        data[param.name] = param.default;
        continue;
      }

      // Skip validation if value is undefined and not required
      if (value === undefined) {
        continue;
      }

      // Type validation
      const typeValid = this.validateType(value, param);
      if (!typeValid.valid) {
        errors.push({
          path: param.name,
          message: typeValid.error || 'Invalid type',
        });
        continue;
      }

      // Enum validation
      if (param.enum && !param.enum.includes(value)) {
        errors.push({
          path: param.name,
          message: `Value must be one of: ${param.enum.join(', ')}`,
        });
        continue;
      }

      // Range validation (numbers)
      if (param.type === 'number') {
        if (param.min !== undefined && value < param.min) {
          errors.push({
            path: param.name,
            message: `Value must be >= ${param.min}`,
          });
          continue;
        }
        if (param.max !== undefined && value > param.max) {
          errors.push({
            path: param.name,
            message: `Value must be <= ${param.max}`,
          });
          continue;
        }
      }

      // Pattern validation (strings)
      if (param.type === 'string' && param.pattern) {
        const regex = new RegExp(param.pattern);
        if (!regex.test(value)) {
          errors.push({
            path: param.name,
            message: `Value does not match pattern: ${param.pattern}`,
          });
          continue;
        }
      }

      data[param.name] = value;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, data };
  }

  /**
   * Validate value type
   */
  private validateType(value: any, param: Parameter): { valid: boolean; error?: string } {
    switch (param.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: 'Must be a number' };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: 'Must be a boolean' };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return { valid: false, error: 'Must be an array' };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return { valid: false, error: 'Must be an object' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Generate Commander.js CLI command (P0-1: Subcommand trees, P0-2: Positional args)
   */
  toCLI(): any {
    // Lazy load commander to avoid hard dependency
    let Command: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Command = require('commander').Command;
    } catch {
      throw new Error(
        'commander package is required for CLI generation. Install with: npm install commander'
      );
    }

    // Determine command path (P0-1)
    const commandPath = this.schema.cli?.path || this.schema.name.split(' ');
    const commandName = commandPath[commandPath.length - 1];

    // Create the leaf command
    const cmd = new Command(commandName);
    cmd.description(this.schema.description);

    // P0-6: Enable pass-through options if requested
    if (this.schema.cli?.allowUnknownOption) {
      cmd.allowUnknownOption();
    }
    if (this.schema.cli?.passThroughOptions) {
      cmd.passThroughOptions();
    }

    // Separate positional from option parameters (P0-2)
    const positionalParams = this.schema.input.parameters
      .filter((p) => p.positional)
      .sort((a, b) => {
        const posA = a.position !== undefined ? a.position : Infinity;
        const posB = b.position !== undefined ? b.position : Infinity;
        return posA - posB;
      });

    const optionParams = this.schema.input.parameters.filter((p) => !p.positional);

    // Add positional arguments (P0-2)
    for (const param of positionalParams) {
      let argSyntax = param.name;

      if (param.variadic) {
        // Variadic: <files...>
        argSyntax = param.required ? `<${param.name}...>` : `[${param.name}...]`;
      } else {
        // Regular positional: <file>
        argSyntax = param.required ? `<${param.name}>` : `[${param.name}]`;
      }

      cmd.argument(argSyntax, param.description, param.default);
    }

    // Add option parameters
    for (const param of optionParams) {
      // Boolean flags don't take values - just --flag (not --flag [value])
      const isBoolean = param.type === 'boolean';
      const flags = isBoolean
        ? `--${param.name}`
        : param.required
          ? `--${param.name} <${param.name}>`
          : `--${param.name} [${param.name}]`;

      if (param.required && !isBoolean) {
        cmd.requiredOption(flags, param.description);
      } else {
        cmd.option(flags, param.description, param.default);
      }
    }

    // Add aliases if specified
    if (this.schema.cli?.aliases) {
      for (const alias of this.schema.cli.aliases) {
        cmd.alias(alias);
      }
    }

    // Wire up action handler
    // Commander passes positional args first, then options object
    cmd.action(async (...actionArgs: any[]) => {
      try {
        // Extract positional args and options
        // Last argument is the command object, second-to-last is options
        const cmdObj = actionArgs[actionArgs.length - 1];
        const options = actionArgs[actionArgs.length - 2];
        const positionalValues = actionArgs.slice(0, actionArgs.length - 2);

        // Merge positional args with options
        const args: any = { ...options };
        for (let i = 0; i < positionalParams.length; i++) {
          const param = positionalParams[i];
          if (i < positionalValues.length) {
            args[param.name] = positionalValues[i];
          }
        }

        // Build execution context (P0-4, P0-5, P0-6)
        const context: ExecutionContext = {
          interface: 'cli',
          stdout: process.stdout,
          stderr: process.stderr,
          stdin: process.stdin,
          isTTY: process.stdout.isTTY,
        };

        // Add streaming support if enabled (P0-4)
        if (this.schema.cli?.streaming) {
          context.stream = process.stdout;
        }

        // Add prompt function if TTY (P0-5)
        if (context.isTTY) {
          context.prompt = async (
            message: string,
            options?: { default?: string; mask?: boolean }
          ) => {
            // Simple readline-based prompt
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout,
            });

            return new Promise<string>((resolve) => {
              const promptText = options?.default
                ? `${message} [${options.default}]: `
                : `${message}: `;

              rl.question(promptText, (answer: string) => {
                rl.close();
                resolve(answer || options?.default || '');
              });
            });
          };
        }

        // Add pass-through options if enabled (P0-6)
        if (this.schema.cli?.passThroughOptions && cmdObj.args) {
          // Find '--' separator and capture everything after
          const separatorIndex = process.argv.indexOf('--');
          if (separatorIndex !== -1) {
            context.passThroughOptions = process.argv.slice(separatorIndex + 1);
          }
        }

        const result = await this.execute(args, context);

        // Format output
        if (this.schema.cli?.format) {
          console.log(this.schema.cli.format(result));
        } else if (this.schema.output.type === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      } catch (error: any) {
        console.error('Error:', error.message);

        // P1-7: Use proper exit code mapping
        const exitCode = error.getExitCode
          ? error.getExitCode()
          : (error.details?.exitCode ?? error.details?.status ?? 1);
        process.exit(exitCode);
      }
    });

    return cmd;
  }

  /**
   * Build nested subcommand tree (P0-1)
   * Given a command path like ['git', 'worktree', 'merge'], creates:
   * sc git worktree merge (not sc git <worktree> <merge>)
   */
  static buildCommandTree(commands: UniversalCommand[]): any {
    let Command: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Command = require('commander').Command;
    } catch {
      throw new Error('commander package is required. Install with: npm install commander');
    }

    // Build tree structure
    const tree: Map<string, any> = new Map();

    for (const command of commands) {
      const path = command.schema.cli?.path || command.schema.name.split(' ');

      // Navigate/create tree
      let current: any = null;
      let parentKey = '';

      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i];
        const key = parentKey ? `${parentKey}.${segment}` : segment;

        if (!tree.has(key)) {
          const subCmd = new Command(segment);
          tree.set(key, subCmd);

          // Add to parent
          if (current) {
            current.addCommand(subCmd);
          }
        }

        current = tree.get(key);
        parentKey = key;
      }

      // Add leaf command
      const leafCmd = command.toCLI();
      if (current) {
        current.addCommand(leafCmd);
      } else {
        tree.set(path[0], leafCmd);
      }
    }

    // Return root commands
    const roots: any[] = [];
    for (const [key, cmd] of tree.entries()) {
      if (!key.includes('.')) {
        roots.push(cmd);
      }
    }

    return roots;
  }

  /**
   * Generate Next.js API route handler
   */
  toNextAPI(): NextAPIRoute {
    const method = this.schema.api?.method || 'GET';

    const handler = async (request: any, context?: any) => {
      try {
        // Extract arguments from request
        const args = await this.extractAPIArgs(request, context);

        // Execute command
        const result = await this.execute(args, {
          interface: 'api',
          request,
        });

        // Create response
        let NextResponse: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          NextResponse = require('next/server').NextResponse;
        } catch {
          throw new Error(
            'next package is required for API generation. Install with: npm install next'
          );
        }

        const response = NextResponse.json(result);

        // Apply cache control if specified
        if (this.schema.api?.cacheControl) {
          const { maxAge, staleWhileRevalidate, revalidate } = this.schema.api.cacheControl;
          const cacheHeader = [
            maxAge !== undefined && `max-age=${maxAge}`,
            staleWhileRevalidate !== undefined && `stale-while-revalidate=${staleWhileRevalidate}`,
            revalidate !== undefined && `s-maxage=${revalidate}`,
          ]
            .filter(Boolean)
            .join(', ');

          if (cacheHeader) {
            response.headers.set('Cache-Control', cacheHeader);
          }
        }

        return response;
      } catch (error: any) {
        let NextResponse: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          NextResponse = require('next/server').NextResponse;
        } catch {
          // Fallback to basic Response
          return new Response(JSON.stringify({ error: error.message }), {
            status: error.details?.status || 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return NextResponse.json(
          { error: error.message, details: error.details },
          { status: error.details?.status || 500 }
        );
      }
    };

    return { [method]: handler } as NextAPIRoute;
  }

  /**
   * Extract arguments from API request
   */
  private async extractAPIArgs(request: any, context?: any): Promise<TInput> {
    const args: any = {};

    // Extract from URL search params (GET requests)
    if (request.nextUrl?.searchParams) {
      for (const param of this.schema.input.parameters) {
        const value = request.nextUrl.searchParams.get(param.name);
        if (value !== null) {
          args[param.name] = this.coerceType(value, param.type);
        }
      }
    }

    // Extract from route params (e.g., [repoId])
    if (context?.params) {
      const params = await Promise.resolve(context.params);
      Object.assign(args, params);
    }

    // Extract from request body (POST/PUT/PATCH)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        const body = await request.json();
        Object.assign(args, body);
      } catch {
        // Body might not be JSON, ignore
      }
    }

    return args;
  }

  /**
   * Coerce string value to parameter type
   */
  private coerceType(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'array':
        return value.split(',').map((s) => s.trim());
      default:
        return value;
    }
  }

  /**
   * Generate MCP tool definition
   */
  toMCP(): MCPToolDefinition {
    const toolName =
      this.schema.mcp?.toolName || `sc_${this.schema.name.replace(/\s+/g, '_').toLowerCase()}`;

    return {
      name: toolName,
      description: this.schema.description,
      inputSchema: this.parametersToJSONSchema(),
      execute: async (args: any) => {
        try {
          const result = await this.execute(args, { interface: 'mcp' });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
          };
        }
      },
    };
  }

  /**
   * Convert parameters to JSON Schema
   */
  private parametersToJSONSchema(): any {
    const properties: any = {};
    const required: string[] = [];

    for (const param of this.schema.input.parameters) {
      properties[param.name] = this.parameterToJSONSchema(param);

      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && { required }),
    };
  }

  /**
   * Convert single parameter to JSON Schema
   */
  private parameterToJSONSchema(param: Parameter): any {
    const schema: any = {
      type: param.type,
      description: param.description,
    };

    if (param.default !== undefined) {
      schema.default = param.default;
    }

    if (param.enum) {
      schema.enum = param.enum;
    }

    if (param.type === 'number') {
      if (param.min !== undefined) schema.minimum = param.min;
      if (param.max !== undefined) schema.maximum = param.max;
    }

    if (param.type === 'string' && param.pattern) {
      schema.pattern = param.pattern;
    }

    if (param.type === 'array' && param.items) {
      schema.items = this.parameterToJSONSchema(param.items);
    }

    if (param.type === 'object' && param.properties) {
      schema.properties = Object.fromEntries(
        Object.entries(param.properties).map(([key, prop]) => [
          key,
          this.parameterToJSONSchema(prop),
        ])
      );
    }

    return schema;
  }

  /**
   * Get the API route path for this command
   */
  getAPIRoutePath(): string {
    const parts = this.schema.name.split(' ');
    return parts.join('/');
  }

  /**
   * Get the MCP tool name
   */
  getMCPToolName(): string {
    return this.schema.mcp?.toolName || `sc_${this.schema.name.replace(/\s+/g, '_').toLowerCase()}`;
  }

  /**
   * Describe all interfaces this command supports
   * Useful for discovery and debugging
   */
  describe(): CommandDescription {
    const apiPath = '/' + this.getAPIRoutePath();
    const mcpTool = this.getMCPToolName();

    return {
      name: this.schema.name,
      description: this.schema.description,
      scope: this.schema.scope || 'global',
      category: this.schema.category,
      keywords: this.schema.keywords || [],

      interfaces: {
        cli: {
          command: `sc ${this.schema.name}`,
          aliases: this.schema.cli?.aliases?.map((a) => `sc ${a}`) || [],
          options: this.schema.input.parameters.map((p) => ({
            flag: `--${p.name}`,
            description: p.description,
            required: p.required || false,
            default: p.default,
            type: p.type,
          })),
        },
        api: {
          method: this.schema.api?.method || 'GET',
          path: apiPath,
          cacheControl: this.schema.api?.cacheControl,
        },
        mcp: {
          toolName: mcpTool,
          inputSchema: this.parametersToJSONSchema(),
        },
      },

      parameters: this.schema.input.parameters.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required || false,
        default: p.default,
        enum: p.enum,
      })),
    };
  }

  /**
   * Get a human-readable summary of all interfaces
   */
  describeAsText(): string {
    const desc = this.describe();
    const lines: string[] = [];

    lines.push(`Command: ${desc.name}`);
    lines.push(`Description: ${desc.description}`);
    lines.push(`Scope: ${desc.scope}`);
    if (desc.category) lines.push(`Category: ${desc.category}`);
    if (desc.keywords.length) lines.push(`Keywords: ${desc.keywords.join(', ')}`);
    lines.push('');

    lines.push('Interfaces:');
    lines.push(`  CLI: ${desc.interfaces.cli.command}`);
    if (desc.interfaces.cli.aliases.length) {
      lines.push(`       Aliases: ${desc.interfaces.cli.aliases.join(', ')}`);
    }
    lines.push(`  API: ${desc.interfaces.api.method} ${desc.interfaces.api.path}`);
    lines.push(`  MCP: ${desc.interfaces.mcp.toolName}`);
    lines.push('');

    if (desc.parameters.length) {
      lines.push('Parameters:');
      for (const p of desc.parameters) {
        const req = p.required ? ' (required)' : '';
        const def = p.default !== undefined ? ` [default: ${p.default}]` : '';
        lines.push(`  --${p.name}: ${p.type}${req}${def}`);
        lines.push(`      ${p.description}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Description of a command's interfaces
 */
export interface CommandDescription {
  name: string;
  description: string;
  scope: string;
  category?: string;
  keywords: string[];

  interfaces: {
    cli: {
      command: string;
      aliases: string[];
      options: Array<{
        flag: string;
        description: string;
        required: boolean;
        default?: any;
        type: string;
      }>;
    };
    api: {
      method: string;
      path: string;
      cacheControl?: { maxAge?: number; staleWhileRevalidate?: number; revalidate?: number };
    };
    mcp: {
      toolName: string;
      inputSchema: any;
    };
  };

  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
    enum?: any[];
  }>;
}
