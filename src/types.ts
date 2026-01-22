/**
 * Core types for Universal Command system
 */

/**
 * Execution context provides interface-specific information
 */
export interface ExecutionContext {
  /** Which interface is executing the command */
  interface: 'cli' | 'api' | 'mcp' | 'test';

  /** Project root directory (if applicable) */
  projectRoot?: string;

  /** API-specific: HTTP request object */
  request?: any; // NextRequest | Request

  /** CLI-specific: Output streams (or any writable stream for testing) */
  stdout?: NodeJS.WriteStream | NodeJS.WritableStream;
  stderr?: NodeJS.WriteStream | NodeJS.WritableStream;

  /**
   * Streaming output support (P0-4)
   * Use for large datasets to avoid OOM errors
   */
  stream?: NodeJS.WritableStream;

  /**
   * CLI input stream (P0-5)
   * For reading user input, pipes, etc.
   */
  stdin?: NodeJS.ReadStream | NodeJS.ReadableStream;

  /**
   * Whether running in interactive TTY (P0-5)
   * Use to determine if prompts/colors are appropriate
   */
  isTTY?: boolean;

  /**
   * Prompt function for interactive input (P0-5)
   * Example: const name = await context.prompt('Enter name:')
   */
  prompt?: (message: string, options?: { default?: string; mask?: boolean }) => Promise<string>;

  /**
   * Pass-through options from CLI (P0-6)
   * Options after '--' that weren't recognized
   */
  passThroughOptions?: string[];

  /** Additional context data */
  [key: string]: any;
}

/**
 * Parameter definition for command input
 */
export interface Parameter {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /** Human-readable description */
  description: string;

  /** Whether parameter is required */
  required?: boolean;

  /** Default value if not provided */
  default?: any;

  /** Allowed values (enum) */
  enum?: any[];

  /** Minimum value (for numbers) */
  min?: number;

  /** Maximum value (for numbers) */
  max?: number;

  /** Regex pattern (for strings) */
  pattern?: string;

  /** Item schema (for arrays) */
  items?: Parameter;

  /** Properties (for objects) */
  properties?: Record<string, Parameter>;

  /**
   * Whether this parameter is positional (not a --flag) (P0-2)
   * Positional args appear as: sc command <arg1> <arg2> instead of --arg1 value
   */
  positional?: boolean;

  /**
   * Whether this parameter accepts multiple values (variadic) (P0-2)
   * Example: sc command <files...> accepts one or more file paths
   * Requires positional: true
   */
  variadic?: boolean;

  /**
   * Position index for positional arguments (P0-2)
   * 0-based. If omitted, uses order in parameters array
   * Only relevant when positional: true
   */
  position?: number;

  /**
   * Short aliases for this parameter (P1 feature)
   * Example: ['v'] for --verbose/-v
   */
  aliases?: string[];
}

/**
 * CLI-specific options
 */
export interface CLIOptions {
  /** Custom output formatter */
  format?: (result: any, args?: any) => string;

  /** Enable streaming output */
  streaming?: boolean;

  /** Show progress indicator */
  progress?: boolean;

  /** Command aliases */
  aliases?: string[];

  /** Usage examples for help text */
  examples?: string[];

  /**
   * Command path for nested subcommands (P0-1)
   * Example: ['git', 'worktree', 'merge'] creates: sc git worktree merge
   * If omitted, uses schema.name split by spaces
   */
  path?: string[];

  /**
   * Allow unknown options to pass through (P0-6)
   * Enables: sc command --known-flag -- --unknown-flag
   */
  allowUnknownOption?: boolean;

  /**
   * Pass through unknown options to handler (P0-6)
   * When true, options after '--' are available in context.passThroughOptions
   */
  passThroughOptions?: boolean;
}

/**
 * API-specific options
 */
export interface APIOptions {
  /** HTTP method (default: inferred from handler) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /** Cache control settings */
  cacheControl?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    revalidate?: number;
  };

  /** Rate limiting */
  rateLimit?: {
    requests: number;
    window: string; // e.g., '1m', '1h'
  };

  /** Authentication requirements */
  auth?: {
    required: boolean;
    roles?: string[];
  };
}

/**
 * MCP-specific options
 */
export interface MCPOptions {
  /** Related MCP resources */
  resourceLinks?: string[];

  /** MCP capabilities */
  capabilities?: string[];

  /** Custom tool name (default: generated from command name) */
  toolName?: string;
}

/**
 * Scope definition for semantic tool grouping
 * Scopes enable O(1) lookup and progressive loading
 */
export interface Scope {
  /** Unique identifier (e.g., 'requirement', 'git', 'deploy') */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description for AI understanding */
  description: string;

  /** Keywords for semantic matching */
  keywords: string[];

  /** Parent scope ID for hierarchy */
  parent?: string;

  /** Child scope IDs */
  children?: string[];

  /** Required application states for availability */
  requiredStates?: string[];

  /** Always loaded (like 'global' scope) */
  autoLoad?: boolean;

  /** Load automatically when parent loads */
  loadWithParent?: boolean;
}

/**
 * Scope-specific options for commands
 */
export interface ScopeOptions {
  /** Which scope this command belongs to (default: 'global') */
  scope?: string;

  /** Keywords for semantic discovery */
  keywords?: string[];

  /** Required states for this specific command */
  requiredStates?: string[];
}

/**
 * Command schema defining the entire command
 */
export interface CommandSchema<TInput = any, TOutput = any> {
  /** Command name (e.g., 'requirement list') */
  name: string;

  /** Human-readable description */
  description: string;

  /** Category/group for organization */
  category?: string;

  /** Scope this command belongs to (default: 'global') */
  scope?: string;

  /** Keywords for semantic discovery */
  keywords?: string[];

  /** Required application states for availability */
  requiredStates?: string[];

  /** Input schema */
  input: {
    parameters: Parameter[];
  };

  /** Output schema */
  output: {
    type: 'json' | 'text' | 'stream';
    schema?: any; // JSONSchema
  };

  /** Core handler function (works for all interfaces) */
  handler: (args: TInput, context: ExecutionContext) => Promise<TOutput>;

  /** CLI-specific options */
  cli?: CLIOptions;

  /** API-specific options */
  api?: APIOptions;

  /** MCP-specific options */
  mcp?: MCPOptions;
}

/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * MCP tool definition
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSONSchema
  execute: (args: any) => Promise<{
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      resource?: string;
    }>;
  }>;
}

/**
 * Next.js API route handler
 */
export interface NextAPIRoute {
  GET?: (request: any, context?: any) => Promise<Response>;
  POST?: (request: any, context?: any) => Promise<Response>;
  PUT?: (request: any, context?: any) => Promise<Response>;
  DELETE?: (request: any, context?: any) => Promise<Response>;
  PATCH?: (request: any, context?: any) => Promise<Response>;
}
