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

  /**
   * Identifies which session this execution belongs to, for simple
   * multi-turn state (e.g. a session-owning ACP client tracking its own
   * in-flight work as part of a future meta-harness). Optional and
   * additive — a command that never reads it sees no behavior change.
   * Populated from: an `SC_SESSION_ID` env var on the CLI surface, an
   * `x-session-id` request header on the API surface, or the real MCP
   * transport's own session id on the MCP surface (see toMCP() /
   * MCPCallExtra below).
   */
  sessionId?: string;

  /**
   * The session's own key/value store, when the caller has one wired up
   * in-process (e.g. a Next.js API route with session middleware). Not
   * populated by toCLI() — a CLI invocation is a separate OS process, so
   * a live store object can't cross that boundary; only sessionId (a
   * plain string) can.
   */
  session?: SessionStore;

  /** MCP surface only: which transport delivered the call. Unset for stdio and non-MCP callers. */
  transport?: 'stdio' | 'http';

  /**
   * The Claude Code session id the CALLER asserts, read from the
   * `X-Claude-Session-Id` request header on the MCP HTTP transport. Distinct
   * from `sessionId` (the MCP transport's own id). It identifies, it does not
   * authenticate: the Bearer token is the authentication.
   */
  callerSessionId?: string;

  /**
   * MCP HTTP only: company from the `X-Supernal-Company-Slug` header. The tenancy resolver
   * treats it as a lock, never as a way to lift one.
   */
  callerCompanySlug?: string;

  /** MCP HTTP only: the caller's User-Agent, for audit logs. */
  callerUserAgent?: string;

  /** MCP only: the tool name this call was made under. */
  mcpToolName?: string;

  /** Additional context data */
  [key: string]: any;
}

/**
 * Minimal key/value store for session-scoped state, threaded through
 * ExecutionContext.sessionId/session. Deliberately generic — not tied to
 * any particular transport or session-management implementation — so a
 * caller can back it with whatever it has: an in-memory Map, a database
 * row, or (the motivating future use case) a session-owning ACP client
 * exposing its own session control-plane operations (list active
 * sessions, get status, kill a session) as UniversalCommands.
 */
export interface SessionStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
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

  /**
   * Custom exit code resolver — called with the handler result to determine process exit code
   * Useful when a command needs to signal non-zero exit based on result content (e.g. eval scoring)
   */
  exitCode?: (result: any) => number;
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

  /**
   * Map an incoming Next.js dynamic-route param name to a different input
   * parameter name before validation (e.g. a route mounted at
   * `[slug]/rename` whose command parameter is named `oldSlug`). Only
   * affects `toNextAPI()`'s `context.params` extraction — CLI/MCP surfaces
   * are unaffected. Params with no entry here pass through unchanged.
   */
  paramAliases?: Record<string, string>;
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

  /**
   * Free-form usage guidance surfaced to MCP tool consumers/documentation
   * (e.g. parameter interplay, prerequisites, gotchas not captured by the
   * parameter descriptions themselves). Already authored on 10+ commands in
   * packages/agent-tools/src/email/commands/universal/ before this field was
   * declared here — this closes that pre-existing type gap, no behavior change.
   */
  hints?: string[];

  /**
   * Access policy the company gateway enforces on every call. A command that
   * declares none is treated as a high danger write, so only a company_admin
   * session may call it.
   */
  access?: 'read' | 'write';
  danger?: 'low' | 'medium' | 'high';
  /** The RBAC capability the caller must hold (for example board:write). */
  requiredCapability?: string;
  /** True makes the call need company_admin until a real approval flow exists. */
  approval?: boolean;
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

  /**
   * Session-to-company tenancy lock (REQ-STC-101/102). Opt-in: only a command that declares this gets the check. `companyParam`
   * names the validated input parameter (e.g. 'company', 'companySlug') carrying
   * the requested company. execute() calls the guard registered via
   * setTenancyGuard() with that value before invoking the handler; a
   * `platform`-tier session (or no guard registered at all) always passes.
   *
   * NOT the same mechanism as `companyAuth` below — this locks a single
   * long-lived CLI/MCP *session* (identified by CLAUDE_CODE_SESSION_ID or an
   * `x-session-id` header) to one company via a process-wide singleton
   * (`setTenancyGuard()`). It has a NAMED, bounded gap for real browser
   * traffic: a request that never sends `x-session-id` (i.e. essentially
   * every real end-user browser request) resolves to "platform tier" —
   * unrestricted — by design (the host's session guard
   * decides). It does not authenticate a real end user at
   * all. Never rely on `tenancy` alone to authorize an HTTP mutation a real
   * logged-in user's browser can reach — use `companyAuth` for that.
   */
  tenancy?: {
    companyParam: string;
  };

  /**
   * Per-company HTTP authorization for `.toNextAPI()` — distinct from
   * `tenancy` above (a CLI/MCP session lock) and from `api.auth` (an unused
   * role-based placeholder). Opt-in: declares that `slugParam` names the
   * (already-validated) input parameter identifying the company this
   * command reads or mutates, and that the caller must be independently
   * authorized for that specific company before the handler runs.
   *
   * This package has no idea what "authorized" means for any given host
   * (a JWT cookie, a Bearer token, session middleware) — supply that logic
   * via `toNextAPI(options)`'s `authCheck` function (see UniversalCommand.ts
   * `toNextAPI()` and the `CompanyAuthCheckFn` type below). A command that
   * declares `companyAuth` but is served via a `toNextAPI()` call with no
   * `authCheck` supplied FAILS LOUD (throws `AuthorizationError`, HTTP 403) —
   * it never silently allows the request through.
   *
   * Supply `authCheck` to `toNextAPI()` so every company-scoped command is
   * authorized per request.
   */
  companyAuth?: {
    /** Input parameter (post `paramAliases` mapping) naming the target company slug. */
    slugParam: string;
  };
}

/**
 * The result of a `CompanyAuthCheckFn` (see `toNextAPI()`'s `authCheck` option).
 * `response` is REQUIRED when `authorized` is false — the exact HTTP response
 * (e.g. a framework `NextResponse`) `toNextAPI()` returns verbatim, so a host
 * can preserve its own existing 401/403 shapes byte-for-byte instead of
 * getting a generic fallback error body.
 */
export interface CompanyAuthCheckResult {
  authorized: boolean;
  response?: any; // a Response/NextResponse-shaped value, required when authorized is false
}

/**
 * Injectable per-company HTTP auth hook for `toNextAPI({ authCheck })`.
 * `companySlug` is the resolved value of the command's `companyAuth.slugParam`
 * input (may be undefined if the caller omitted it — a real authCheck should
 * treat that as unauthorized, not skip the check). `request` is the raw
 * request object `toNextAPI()` received (typed `any` here so this
 * app-agnostic package never depends on `next/server`'s `NextRequest`).
 *
 * This package deliberately has ZERO knowledge of any specific host's auth
 * mechanism — see `companyAuth` above. A host (e.g. the dashboard) supplies
 * its own implementation composed from its own real auth primitives.
 */
export type CompanyAuthCheckFn = (
  companySlug: string | undefined,
  request: any,
  context: ExecutionContext
) => CompanyAuthCheckResult | Promise<CompanyAuthCheckResult>;

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
 * Minimal, SDK-agnostic subset of the MCP server handler context
 * (`@modelcontextprotocol/server`) that toMCP()'s execute() actually
 * consumes — for real MCP progress notifications on a streaming command, and
 * for session identification. types.ts never imports the SDK statically.
 * Callers construct this from whatever SDK version they have wired up; see
 * mcp/index.ts's toMCPCallExtra() for the reference mapping from the v2
 * handler context.
 */
export interface MCPCallExtra {
  /** The session ID from the MCP transport, if available. */
  sessionId?: string;
  /**
   * Sends a raw MCP notification tied to the in-flight tool call (e.g. a
   * `notifications/progress` update). Transport-routing behavior — using
   * this instead of a bare server-wide notify — matches the SDK's own
   * `ctx.mcpReq.notify`.
   */
  sendNotification?: (notification: {
    method: string;
    params?: Record<string, unknown>;
  }) => Promise<void>;
  /** Metadata from the original `tools/call` request (e.g. `progressToken`). */
  meta?: { progressToken?: string | number; [key: string]: unknown };
  /** Transport that delivered the call (copied to ExecutionContext.transport). */
  transport?: 'stdio' | 'http';
  /** Caller-asserted Claude Code session id (copied to ExecutionContext.callerSessionId). */
  callerSessionId?: string;
  /** Caller-asserted company lock (copied to ExecutionContext.callerCompanySlug). */
  callerCompanySlug?: string;
  /** Caller User-Agent (copied to ExecutionContext.callerUserAgent). */
  callerUserAgent?: string;
}

/**
 * MCP tool definition
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: any; // JSONSchema
  /** MCP tool hints, present only when the command declares `mcp.access`. */
  annotations?: { readOnlyHint: boolean; destructiveHint: boolean };
  /** Carries the `supernal/policy` entry the company gateway reads. */
  _meta?: Record<string, unknown>;
  execute: (
    args: any,
    /**
     * Optional real-transport context — when the command declares
     * `output.type: 'stream'` and the caller supplies both
     * `sendNotification` and a `meta.progressToken`, chunks the handler
     * writes to `context.stream` are emitted as real MCP progress
     * notifications instead of being collapsed into the final JSON blob.
     * Omitted (or missing either piece) falls back to the prior,
     * unchanged behavior — a single final JSON result.
     */
    extra?: MCPCallExtra
  ) => Promise<{
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      resource?: string;
    }>;
    isError?: boolean;
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
