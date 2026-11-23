/**
 * Core UniversalCommand class
 *
 * Defines a command once and generates CLI, API, and MCP interfaces automatically.
 */

import type {
  CommandSchema,
  CompanyAuthCheckFn,
  ExecutionContext,
  ValidationResult,
  MCPCallExtra,
  MCPToolDefinition,
  NextAPIRoute,
  Parameter,
} from './types';
import { AuthorizationError, ValidationError } from './errors';
import { nodeRequire } from './nodeRequire';
import { loadNextResponse } from './nextResponse';

/**
 * Session-to-company tenancy guard (REQ-STC-101/102). A host process (the
 * `sc` CLI, the MCP server, a dashboard API route) registers ONE guard via
 * `setTenancyGuard()` at startup; `execute()` calls it for any command whose
 * schema declares `tenancy.companyParam`. Deliberately host-agnostic — this
 * package has no dependency on how session identity is actually resolved
 * (that lives in the host application), only on the shape
 * of the decision. Returning `undefined`/never calling `setTenancyGuard()`
 * means no check runs at all (today's behavior, zero regression for a host
 * that never registers one — e.g. a test harness or a standalone consumer
 * of this package outside the `sc` ecosystem).
 */
export interface TenancyDecision {
  allowed: boolean;
  /** Human-readable reason, required when allowed is false. */
  reason?: string;
  /**
   * Company to use when the caller omitted the company argument. execute()
   * writes it into the command's `tenancy.companyParam` before the handler
   * runs, so a company-locked session never falls through to a no-company path.
   */
  resolvedCompany?: string;
}

export type TenancyGuardFn = (
  requestedCompanySlug: string | undefined,
  context: ExecutionContext
) => TenancyDecision | Promise<TenancyDecision>;

let tenancyGuard: TenancyGuardFn | null = null;

/** Register the process-wide tenancy guard. Call once per host process at startup. */
export function setTenancyGuard(fn: TenancyGuardFn | null): void {
  tenancyGuard = fn;
}

/** Test/inspection helper — not part of the public contract other hosts should rely on. */
export function getTenancyGuard(): TenancyGuardFn | null {
  return tenancyGuard;
}

/**
 * Process-wide wrapper around every execute() (guard + handler). A host uses
 * it to bind request-scoped state, e.g. the caller's company lock in an
 * AsyncLocalStorage, so code with no ExecutionContext (a storage factory) can
 * still see who the request is for. Unset means execute() runs unwrapped.
 */
export type ExecutionScopeFn = <T>(context: ExecutionContext, run: () => Promise<T>) => Promise<T>;

let executionScope: ExecutionScopeFn | null = null;

/** Register the process-wide execution scope. Call once per host process at startup. */
export function setExecutionScope(fn: ExecutionScopeFn | null): void {
  executionScope = fn;
}

// NOTE: do NOT `import { createRequire } from 'node:module'` at module top level.
// tsup/esbuild hoists that into a top-level `import 'module'` in the ESM bundle,
// which is Node-only and breaks the browser/client bundle the moment a client
// component pulls in the dashboard SDK barrel (which value-imports these classes).
// Lazy Node-only loading goes through `nodeRequire` (./nodeRequire.ts), which never emits
// a static `import 'module'` and is invisible to bundlers. No bare `require(...)` calls
// remain here: esbuild's ESM output turns them into a throwing `__require` shim.

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

    // Session-to-company tenancy check (REQ-STC-101/102) — only for a command
    // that opts in via schema.tenancy, and only when a host process has
    // registered a guard (setTenancyGuard). Runs AFTER arg validation (a
    // malformed request should fail as a validation error, not a tenancy
    // error) and BEFORE the handler — the handler never runs for a rejected
    // request.
    const run = async (): Promise<TOutput> => {
      if (this.schema.tenancy?.companyParam && tenancyGuard) {
        const companyParam = this.schema.tenancy.companyParam;
        const requestedCompany = (validation.data as any)?.[companyParam];
        const decision = await tenancyGuard(requestedCompany, context);
        if (!decision.allowed) {
          throw new AuthorizationError(
            decision.reason ??
              `Command '${this.schema.name}' refused: session is not authorized for company '${requestedCompany}'.`
          );
        }
        if (requestedCompany === undefined && decision.resolvedCompany) {
          validation.data = {
            ...((validation.data as object) ?? {}),
            [companyParam]: decision.resolvedCompany,
          } as TInput;
        }
      }
      return await this.schema.handler(validation.data as TInput, context);
    };

    return executionScope ? await executionScope(context, run) : await run();
  }

  /**
   * Format a command RESULT into the exact string the CLI prints.
   *
   * SINGLE SOURCE OF TRUTH for CLI output formatting — used by toCLI() (the
   * framework-generated action), runCLI() (the sanctioned raw-Commander dispatch
   * helper), and the test harness (testing/index.ts). One implementation means the
   * three surfaces can never drift going forward.
   *
   * NOTE — this is NOT byte-identical to toCLI()'s PRE-EXISTING behaviour for
   * every command: the old toCLI() text-branch did `console.log(result)`
   * (non-string objects rendered via Node's console inspection, e.g.
   * `{ a: 1 }`), whereas this unifies onto the (pre-existing, independently
   * drifted) testing-harness convention. The non-string case below explicitly
   * mirrors util.inspect rather than raw String() so an object still prints
   * readably instead of collapsing to `[object Object]` — see the inline
   * comment below for why plain String() was rejected during review
   * (2026-07-15 adversarial pass, finding #1).
   *
   * Selection order:
   *   1. a cli.format(result, args) callback if the command defines one;
   *   2. JSON.stringify for output.type 'json';
   *   3. the result AS-IS if it is already a string; util.inspect() otherwise
   *      (readable object/array rendering — NOT String(), which would print
   *      the useless `[object Object]` / `1,2` for objects/arrays).
   *
   * CAVEAT for callers relying on cli.format: if the format callback itself
   * throws, runCLI() (below) catches it in the SAME try/catch as the handler
   * call, so a successfully-EXECUTED command whose formatter has a bug gets
   * reported as a FAILED command (`Error: <formatter message>`, exit non-zero)
   * — the command's real (successful) result is discarded. This mirrors
   * toCLI()'s pre-existing coupling; a format bug should be treated as a
   * command bug and fixed, not silently swallowed, but be aware a formatter
   * exception masquerades as a handler exception in the printed error.
   */
  formatForCLI(result: TOutput, args?: TInput): string {
    if (this.schema.cli?.format) {
      return this.schema.cli.format(result, args as any);
    }
    if (this.schema.output.type === 'json') {
      return JSON.stringify(result, null, 2);
    }
    if (typeof result === 'string') {
      return result;
    }
    // util.inspect (not String()) so a non-string, non-JSON result (an object,
    // array, etc.) still renders readably instead of collapsing to
    // "[object Object]" / "1,2" — the exact regression flagged in review.
    return nodeRequire('util').inspect(result, { depth: null });
  }

  /**
   * Dispatch this command from a raw Commander action, GUARANTEEING that output
   * reaches the terminal before the process sets a non-zero exit code.
   *
   * WHY THIS EXISTS — the silent-exit bug class it kills.
   * ---------------------------------------------------------------------------
   * A raw Commander `.action()` that hand-rolls dispatch by calling
   * `cmd.execute(args, ctx)` and then e.g. `if (!result.success) process.exit(1)`
   * NEVER runs the command's cli.format callback — execute() only RETURNS the
   * result object, it does not print it. So a failure encoded as a returned value
   * (e.g. `{ success: false, message }`) shows nothing on the terminal but whatever
   * the handler happened to log, and the process exits non-zero — a fully silent
   * failure. This is exactly what `sc git converge` did on 2026-07-14: it printed
   * only its header, then `process.exit(1)` with the real `result.message` never
   * printed (git/index.ts dispatched via execute()).
   *
   * runCLI() is the sanctioned way for a raw Commander action to invoke a
   * UniversalCommand. It CANNOT silently swallow output:
   *   - On success it ALWAYS prints the formatted result (formatForCLI) to stdout
   *     (a genuinely empty formatted string is the only thing it won't print).
   *   - On a thrown error it ALWAYS prints `Error: <message>` to stderr.
   *   - It maps failures to a non-zero exit via `process.exitCode` (NOT
   *     process.exit(), which truncates buffered writes to a piped stdout/stderr
   *     before they flush). A command that encodes failure as a returned value
   *     supplies `opts.exitCode(result)` to derive the code; a thrown error's exit
   *     code comes from its own mapping. Setting process.exitCode lets the event
   *     loop drain the output, then Node exits with that code.
   *
   * It reports the error and sets the exit code rather than rethrowing, matching a
   * CLI action's contract — callers just `await cmd.runCLI(...)`.
   *
   * ⚠️ PRECONDITION for adopters (2026-07-15 review, finding #3): runCLI uses
   * `process.exitCode`, NOT `process.exit()`, specifically so buffered stdout/
   * stderr writes are never truncated (that truncation IS the bug class this
   * helper exists to kill). The tradeoff: `process.exitCode` only takes effect
   * once the event loop naturally drains and Node exits on its own. If your
   * command's handler leaves an open handle alive (a `setInterval`, an
   * un-`unref()`'d child process, a live TCP/HTTP listener, an open readline
   * interface), the process will HANG instead of exiting — where the old
   * `process.exit()` would have force-terminated it. Every handler you route
   * through runCLI() must close/unref anything it opens before returning, or
   * the CLI action must call `process.exit(process.exitCode ?? 0)` itself
   * after `await`ing runCLI() once it is certain nothing else needs to run.
   *
   * @returns the result on success, or undefined if the handler threw.
   */
  async runCLI(
    args: TInput,
    context: ExecutionContext,
    opts?: {
      /** Map a returned result to a process exit code (0 = success). */
      exitCode?: (result: TOutput) => number;
      /** Set false to suppress the success print (rare; error print still fires). */
      print?: boolean;
    }
  ): Promise<TOutput | undefined> {
    const shouldPrint = opts?.print !== false;
    try {
      const result = await this.execute(args, context);
      if (shouldPrint) {
        const out = this.formatForCLI(result, args);
        // Only an empty formatted string is suppressed; any content is printed.
        if (out !== undefined && out !== null && out !== '') {
          console.log(out);
        }
      }
      // Unconditional assignment (not just "if non-zero") — a success result
      // must explicitly clear any stale non-zero process.exitCode a prior
      // step in the same process may have set, not just leave it alone.
      const code = opts?.exitCode ? opts.exitCode(result) : 0;
      if (typeof code === 'number') {
        process.exitCode = code;
      }
      return result;
    } catch (error: any) {
      console.error('Error:', error?.message ?? String(error));
      const code = error?.getExitCode
        ? error.getExitCode()
        : (error?.details?.exitCode ?? error?.details?.status ?? 1);
      process.exitCode = typeof code === 'number' && code !== 0 ? code : 1;
      return undefined;
    }
  }

  /**
   * Validate arguments against parameter schema
   */
  validateArgs(args: unknown): ValidationResult<TInput> {
    const errors: Array<{ path: string; message: string }> = [];
    const data: any = {};

    for (const param of this.schema.input.parameters) {
      // Commander converts kebab-case options to camelCase (e.g., --dry-run -> dryRun)
      // Check both kebab-case (param.name) and camelCase for compatibility
      const camelName = param.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = (args as any)?.[param.name] ?? (args as any)?.[camelName];

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
      Command = nodeRequire('commander').Command;
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

      // Provide a parseArg coercion function for numeric params so Commander
      // delivers a number to the action handler (not a raw string), which
      // allows validateType to pass without "Must be a number" errors.
      //
      // array-type params need the same treatment for a different reason:
      // without a custom fn, Commander's default option behavior for a
      // repeated flag (`--where a --where b`) is "last value wins" — it
      // hands the handler the raw STRING "b", and validateType's
      // `Array.isArray(value)` then always fails with "Must be an array"
      // ("Invalid command arguments" at the execute() layer), so ANY
      // array-type parameter was unusable from the CLI surface before this
      // fix (confirmed: state.universal.ts's `paths` param had the same
      // latent bug). Commander's documented "collect" pattern accumulates
      // each occurrence into an array instead of overwriting.
      // object-type params arrive from the CLI as a JSON string; parse it so validation sees an object.
      const parseArg =
        param.type === 'number'
          ? (v: string) => Number(v)
          : param.type === 'array'
            ? (v: string, previous: string[] = []) => previous.concat([v])
            : param.type === 'object'
              ? (v: string) => {
                  try {
                    return JSON.parse(v);
                  } catch {
                    throw new (nodeRequire('commander').InvalidArgumentError)(
                      `--${param.name} must be a JSON object`
                    );
                  }
                }
              : undefined;

      if (param.required && !isBoolean) {
        cmd.requiredOption(flags, param.description, parseArg);
      } else if (parseArg !== undefined) {
        cmd.option(flags, param.description, parseArg, param.default);
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
          // projectRoot is the directory the CLI was invoked from. Commands that
          // resolve workspace-relative paths (e.g. cron stores writing
          // .supernal/modules/crons.json) read context.projectRoot; without this
          // the CLI path left it undefined and every such command threw
          // "projectRoot is required". cwd is the correct invocation-dir default.
          projectRoot: process.cwd(),
          stdout: process.stdout,
          stderr: process.stderr,
          stdin: process.stdin,
          isTTY: process.stdout.isTTY,
        };

        // Optional session pass-through (meta-harness prep) — a session-owning
        // wrapper around this CLI process can set SC_SESSION_ID so the handler
        // knows which session it's running under. Undefined when unset — zero
        // behavior change for every existing invocation.
        if (process.env.SC_SESSION_ID) {
          context.sessionId = process.env.SC_SESSION_ID;
        }

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
            const readline = nodeRequire('readline');
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

        // Format output via the single source of truth (formatForCLI) so the
        // framework action, runCLI(), and the test harness can never drift.
        // Only an empty formatted string is suppressed (mirrors runCLI's own
        // guard) — a handler that already printed its own CLI-only output
        // (via cli.format returning '') must not get a second, raw dump here.
        const formatted = this.formatForCLI(result, args);
        if (formatted !== undefined && formatted !== null && formatted !== '') {
          console.log(formatted);
        }
        // cli.exitCode lets a command that returns a failure result (rather than throwing)
        // still exit non-zero. process.exitCode, not process.exit(), so the output above flushes.
        const exitCode = this.schema.cli?.exitCode ? this.schema.cli.exitCode(result) : 0;
        if (exitCode !== 0) process.exitCode = exitCode;
      } catch (error: any) {
        // Write the error SYNCHRONOUSLY before process.exit below. process.exit()
        // discards buffered async writes to a piped (non-TTY) stderr, which would
        // truncate the message to nothing — another silent-failure vector. A
        // successful synchronous fd write cannot be truncated by the exit below.
        // NOTE (2026-07-15 review, finding #6): writeSync can still throw (e.g.
        // EAGAIN on a non-blocking pipe under backpressure), in which case we fall
        // back to the async console.error — which process.exit() CAN still
        // truncate. This is a best-effort upgrade over the prior always-async
        // write, not an absolute guarantee for every fd/stream configuration.
        const msg = `Error: ${error?.message ?? String(error)}\n`;
        try {
          nodeRequire('fs').writeSync((process.stderr as any).fd ?? 2, msg);
        } catch {
          process.stderr.write(msg);
        }

        // P1-7: Use proper exit code mapping
        const exitCode = error?.getExitCode
          ? error.getExitCode()
          : (error?.details?.exitCode ?? error?.details?.status ?? 1);
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
      Command = nodeRequire('commander').Command;
    } catch {
      throw new Error('commander package is required. Install with: npm install commander');
    }

    // Build tree structure
    const tree: Map<string, any> = new Map();

    const pathOf = (c: UniversalCommand): string[] =>
      c.schema.cli?.path || c.schema.name.split(' ');

    // A leaf such as 'room approve' must exist before 'room approve precheck' needs it as a parent
    // (Commander rejects two sibling commands with one name). Only such parents move; the rest keep their order.
    const joined = commands.map((c) => pathOf(c).join(' '));
    const isParent = (i: number) => joined.some((other) => other.startsWith(`${joined[i]} `));
    const ordered = [
      ...commands.filter((_, i) => isParent(i)).sort((a, b) => pathOf(a).length - pathOf(b).length),
      ...commands.filter((_, i) => !isParent(i)),
    ];

    for (const command of ordered) {
      const path = pathOf(command);

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
        tree.set(path.join('.'), leafCmd);
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
   *
   * `options.authCheck` is required (and enforced — see below) for any
   * command whose schema declares `companyAuth`. It is never invoked for a
   * command without `companyAuth` — every pre-existing `toNextAPI()` caller
   * with no `companyAuth`/`authCheck` keeps its exact current behavior.
   */
  toNextAPI(options?: { authCheck?: CompanyAuthCheckFn }): NextAPIRoute {
    const method = this.schema.api?.method || 'GET';

    const handler = async (request: any, context?: any) => {
      const NextResponse = await loadNextResponse();
      try {
        // Extract arguments from request
        const args = await this.extractAPIArgs(request, context);

        // Company-scoped HTTP authorization (opt-in via schema.companyAuth) —
        // runs BEFORE execute() so an unauthorized caller never reaches the
        // handler, the same guarantee a hand-rolled requireCompanyAuth()
        // check gives. A command that declares companyAuth but is served
        // through a toNextAPI() call with no authCheck supplied FAILS LOUD
        // (never silently allows) — see types.ts's companyAuth doc comment.
        if (this.schema.companyAuth) {
          if (!options?.authCheck) {
            throw new AuthorizationError(
              `Command '${this.schema.name}' declares companyAuth but toNextAPI() was called with no authCheck — refusing rather than allowing an unauthorized company-scoped request.`
            );
          }
          const companySlug = (args as any)?.[this.schema.companyAuth.slugParam];
          const authExecContext: ExecutionContext = { interface: 'api', request };
          const authResult = await options.authCheck(companySlug, request, authExecContext);
          if (!authResult.authorized) {
            if (authResult.response) return authResult.response;
            throw new AuthorizationError(
              `Not authorized for company '${companySlug ?? '(none)'}'.`
            );
          }
        }

        // Build execution context — optional session pass-through (meta-harness
        // prep) — additive, no behavior change for a caller that sends neither.
        const execContext: ExecutionContext = {
          interface: 'api',
          request,
        };
        const sessionIdHeader =
          typeof request?.headers?.get === 'function'
            ? request.headers.get('x-session-id')
            : request?.headers?.['x-session-id'];
        if (sessionIdHeader) {
          execContext.sessionId = Array.isArray(sessionIdHeader)
            ? sessionIdHeader[0]
            : sessionIdHeader;
        }
        if (request?.session) {
          execContext.session = request.session;
        }

        // Execute command
        const result = await this.execute(args, execContext);

        // Create response (plain Response when next/server is unavailable)
        const response = NextResponse
          ? NextResponse.json(result)
          : new Response(JSON.stringify(result), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });

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
        if (!NextResponse) {
          return new Response(JSON.stringify({ error: error.message, details: error.details }), {
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

    // Extract from route params (e.g., [repoId]). paramAliases lets a route's
    // dynamic segment name differ from the command's own parameter name
    // (e.g. a route mounted at [slug] whose command parameter is `oldSlug`).
    if (context?.params) {
      const params = (await Promise.resolve(context.params)) as Record<string, unknown>;
      const aliases = this.schema.api?.paramAliases;
      if (aliases) {
        for (const [key, value] of Object.entries(params)) {
          args[aliases[key] ?? key] = value;
        }
      } else {
        Object.assign(args, params);
      }
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
      ...this.mcpPolicyFields(),
      execute: async (args: any, extra?: MCPCallExtra) => {
        try {
          const context: ExecutionContext = { interface: 'mcp', mcpToolName: toolName };
          if (extra?.sessionId !== undefined) {
            context.sessionId = extra.sessionId;
          }
          if (extra?.transport !== undefined) {
            context.transport = extra.transport;
          }
          if (extra?.callerSessionId !== undefined) {
            context.callerSessionId = extra.callerSessionId;
          }
          if (extra?.callerCompanySlug !== undefined) {
            context.callerCompanySlug = extra.callerCompanySlug;
          }
          if (extra?.callerUserAgent !== undefined) {
            context.callerUserAgent = extra.callerUserAgent;
          }

          // Real MCP progress notifications (fixes the prior silent-collapse bug).
          // For a command that declares output.type: 'stream', context.stream is
          // ALWAYS populated — mirroring toCLI()'s contract where `cli.streaming:
          // true` always sets context.stream to process.stdout, regardless of
          // transport capability — so a streaming handler never has to guard
          // `if (context.stream)` before writing:
          //   - when the caller supplied BOTH a real sendNotification and a
          //     progressToken (mirrors the SDK's own
          //     `_meta?.progressToken !== undefined` gate for progress),
          //     each chunk written is relayed as a real
          //     `notifications/progress` MCP notification;
          //   - otherwise (no progress-capable caller/transport), writes go to a
          //     no-op sink — the handler still runs exactly the same, its writes
          //     are just not observable to this particular caller.
          // A NON-streaming command (output.type !== 'stream') is completely
          // unaffected either way — no context.stream, one final JSON blob,
          // identical to the pre-fix behavior. toTool() (a different surface)
          // still explicitly rejects streaming commands, unchanged.
          const { Writable } = nodeRequire('stream');
          // A Writable that is given an error via its write callback ALSO emits
          // a Node 'error' event — if nothing is listening for it, that event
          // becomes an uncaught exception that crashes the whole process, not
          // just this one call (a well-known Node stream gotcha, confirmed by
          // adversarial review: a single failed sendNotification — a client
          // disconnect, transport backpressure — could otherwise take down
          // every other in-flight MCP request on this server). The real error
          // is still delivered to the caller via streamToFinish.end()'s own
          // callback below; this listener exists ONLY to stop it from also
          // propagating as an uncaught 'error' event.
          const suppressUncaughtStreamError = (stream: InstanceType<typeof Writable>) => {
            stream.on('error', () => {});
            return stream;
          };
          if (this.schema.output.type === 'stream') {
            const progressToken = extra?.meta?.progressToken;
            if (extra?.sendNotification && progressToken !== undefined) {
              const sendNotification = extra.sendNotification;
              let sequence = 0;
              context.stream = suppressUncaughtStreamError(
                new Writable({
                  write(
                    chunk: unknown,
                    _encoding: string,
                    callback: (error?: Error | null) => void
                  ) {
                    sequence += 1;
                    sendNotification({
                      method: 'notifications/progress',
                      params: {
                        progressToken,
                        progress: sequence,
                        message:
                          typeof chunk === 'string'
                            ? chunk
                            : Buffer.isBuffer(chunk)
                              ? chunk.toString()
                              : String(chunk),
                      },
                    }).then(
                      () => callback(),
                      (err: unknown) =>
                        callback(err instanceof Error ? err : new Error(String(err)))
                    );
                  },
                })
              );
            } else {
              context.stream = suppressUncaughtStreamError(
                new Writable({
                  write(
                    _chunk: unknown,
                    _encoding: string,
                    callback: (error?: Error | null) => void
                  ) {
                    callback();
                  },
                })
              );
            }
          }

          const result = await this.execute(args, context);

          // If we created a stream above, wait for every already-queued write's
          // underlying `_write` callback to fire (i.e. every sendNotification
          // call to resolve) before returning the final result. Without this,
          // a handler that writes several chunks and returns immediately can
          // race the final JSON result past its own trailing progress
          // notifications — Node's Writable does not otherwise guarantee
          // queued writes are flushed just because the handler's promise
          // resolved.
          if (context.stream) {
            const streamToFinish = context.stream;
            // Bounded, not indefinite: a hung (never-resolving, never-rejecting)
            // sendNotification — a slow-draining transport with no clean abort,
            // for instance — must not hang this tool call forever. 10s comfortably
            // covers real notification round-trips; on timeout the call still
            // completes and returns its real result, just without a guarantee
            // every trailing progress chunk was delivered.
            const STREAM_FLUSH_TIMEOUT_MS = 10_000;
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => resolve(), STREAM_FLUSH_TIMEOUT_MS);
              streamToFinish.end((err?: Error | null) => {
                clearTimeout(timer);
                err ? reject(err) : resolve();
              });
            });
          }

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
            isError: true,
          };
        }
      },
    };
  }

  /** Tool hints and the `supernal/policy` entry, only when the command declares `mcp.access`. */
  private mcpPolicyFields(): Pick<MCPToolDefinition, 'annotations' | '_meta'> {
    const mcp = this.schema.mcp;
    if (mcp?.access !== 'read' && mcp?.access !== 'write') return {};
    // A present but invalid value declares nothing, so the gateway treats the tool as a high danger write.
    if (
      mcp.danger !== undefined &&
      mcp.danger !== 'low' &&
      mcp.danger !== 'medium' &&
      mcp.danger !== 'high'
    )
      return {};
    if (mcp.approval !== undefined && typeof mcp.approval !== 'boolean') return {};
    if (
      mcp.requiredCapability !== undefined &&
      (typeof mcp.requiredCapability !== 'string' || mcp.requiredCapability === '')
    )
      return {};
    const danger = mcp.danger ?? (mcp.access === 'read' ? 'low' : 'medium');
    return {
      annotations: {
        readOnlyHint: mcp.access === 'read',
        destructiveHint: mcp.access === 'write' && danger === 'high',
      },
      _meta: {
        'supernal/policy': {
          access: mcp.access,
          danger,
          approval: mcp.approval === true,
          ...(mcp.requiredCapability ? { requiredCapability: mcp.requiredCapability } : {}),
        },
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

    if (param.type === 'array') {
      // OpenAI/Codex requires `items` on array schemas; default to string if not specified
      schema.items = param.items ? this.parameterToJSONSchema(param.items) : { type: 'string' };
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
   * Generate a config + handler pair for use with @supernal/interface's Tool decorator.
   *
   * The returned object can be passed directly to fromCommand() in @supernal/interface,
   * or used manually with Tool(config)(handler) to register this command in the ToolRegistry.
   * The handler calls execute() with interface: 'api' — same validation path as toNextAPI().
   *
   * Constraints:
   * - Commands with output.type === 'stream' are not supported; toTool() throws immediately.
   * - The ExecutionContext passed to the handler has interface: 'api' but no request object.
   *   Command handlers that call context.request.* will throw at runtime. Design handlers
   *   to treat context.request as optional when they are intended for multi-surface use.
   * - aiEnabled defaults to false. Pass extraConfig: { aiEnabled: true } explicitly for
   *   commands you want AI agents to discover and call autonomously.
   *
   * @example with fromCommand helper (recommended)
   *   import { fromCommand } from '@supernal/interface'
   *   export const myTool = fromCommand(myCommand)
   *
   * @example opt in to AI agent access
   *   export const myTool = fromCommand(myCommand, { aiEnabled: true })
   *
   * @example manual wiring
   *   import { Tool } from '@supernal/interface'
   *   const { config, handler } = myCommand.toTool()
   *   export const myTool = Tool(config)(handler)
   */
  toTool(extraConfig?: Record<string, unknown>): {
    config: Record<string, unknown>;
    handler: (args: TInput) => Promise<TOutput>;
  } {
    if (this.schema.output.type === 'stream') {
      throw new Error(
        `toTool() does not support streaming commands (command: '${this.schema.name}'). ` +
          `Wrap the handler in a non-streaming adapter before registering with ToolRegistry.`
      );
    }
    return {
      config: {
        name: this.schema.name,
        description: this.schema.description,
        keywords: this.schema.keywords || [],
        inputSchema: this.parametersToJSONSchema(),
        // ToolConfig only supports 'json' | 'markdown'. output.type 'text' maps to 'markdown'
        // which may trigger rendering in some consumers — design text-output handlers accordingly.
        returnType: this.schema.output.type === 'json' ? 'json' : 'markdown',
        executionContext: 'api',
        // Default false — callers must explicitly opt in via extraConfig: { aiEnabled: true }.
        // Matches @Tool's safe default (aiEnabled: false for standalone functions).
        aiEnabled: false,
        ...extraConfig,
      },
      handler: Object.defineProperty(
        (args: TInput) => this.execute(args, { interface: 'api' }),
        'name',
        { value: this.schema.name.replace(/\s+/g, '_'), writable: false }
      ) as (args: TInput) => Promise<TOutput>,
    };
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
