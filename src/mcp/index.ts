/**
 * MCP-specific utilities for Universal Command
 *
 * Creates a fully-wired MCP server from a CommandRegistry.
 * Uses ESM dynamic import for the SDK so this module works in both CJS and ESM.
 */

import { CommandRegistry } from '../CommandRegistry.js';
import type { CallToolResult } from '@modelcontextprotocol/server';
import type { MCPCallExtra } from '../types.js';

/**
 * Maps a real @modelcontextprotocol/server handler context (`ctx`, kept loosely
 * typed here — the SDK is a lazy-loaded, optional peer dependency; this
 * module dynamic-imports it, never a static import) into the SDK-agnostic
 * `MCPCallExtra` shape `UniversalCommand.toMCP()`'s `execute()` actually
 * consumes. Extracted as its own function so the mapping itself is
 * unit-testable without spinning up a full MCP transport.
 */
export function toMCPCallExtra(ctx?: {
  sessionId?: string;
  mcpReq?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notify?: (notification: any) => Promise<void>;
    _meta?: Record<string, unknown>;
  };
}): MCPCallExtra {
  return {
    sessionId: ctx?.sessionId,
    sendNotification: ctx?.mcpReq?.notify as MCPCallExtra['sendNotification'],
    meta: ctx?.mcpReq?._meta as MCPCallExtra['meta'],
  };
}

/**
 * Caller-supplied version-staleness info for an MCP server. The package never
 * fetches "latest" itself (no network I/O on server construction, no
 * assumption every server is npm-published) — the caller resolves
 * `latestVersion` however fits its own deployment (an `sc mcp` supervisor
 * tick, a build-time check, a cron) and passes the result in.
 */
export interface StalenessInfo {
  /** The newest known version, however the caller determined it. */
  latestVersion: string;
  /** Optional human-readable update instructions surfaced to the calling agent. */
  updateHint?: string;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities?: Record<string, unknown>;
  /** When latestVersion !== version, nudges the calling agent to update (see StalenessInfo). */
  staleness?: StalenessInfo;
  /** Server instructions shown to the calling model, joined with any staleness notice. */
  instructions?: string;
}

function stalenessNotice(config: MCPServerConfig): string | undefined {
  const s = config.staleness;
  if (!s || s.latestVersion === config.version) return undefined;
  return (
    `⚠️ ${config.name} is running an outdated version (${config.version}); ` +
    `${s.latestVersion} is available.` +
    (s.updateHint ? ` ${s.updateHint}` : '')
  );
}

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
 *
 * @example With a staleness nudge (surfaced via the standard MCP `instructions`
 * field, shown to the calling agent/model once per session — not per tool call):
 * const server = await createMCPServer(registry, {
 *   name: 'my-server',
 *   version: '1.2.0',
 *   staleness: { latestVersion: '1.3.0', updateHint: 'Run: sc mcp update my-server' },
 * });
 */
/**
 * Request-scoped identity merged into every tool call's MCPCallExtra. The HTTP
 * app builds one server per request and passes the caller's transport and
 * asserted Claude session id through here.
 */
export interface MCPCallContext {
  transport?: 'stdio' | 'http';
  callerSessionId?: string;
  callerCompanySlug?: string;
  callerUserAgent?: string;
}

/** Header carrying the caller's Claude Code session id on the HTTP transport. */
export const CLAUDE_SESSION_HEADER = 'x-claude-session-id';

/** Header carrying a company lock the caller's own env asserts (SUPERNAL_COMPANY_SLUG). */
export const SUPERNAL_COMPANY_HEADER = 'x-supernal-company-slug';

/**
 * The caller identity a request's headers assert. The Claude session id travels in a
 * header, never in tool args, so a model cannot pick a different session per call. An
 * absent or malformed session id is dropped; the host's tenancy policy decides what that
 * means. A company header is passed through unvalidated: a malformed value still means
 * "lock me", so the tenancy resolver refuses it instead of treating it as absent.
 */
export function callContextFromHeaders(read: (name: string) => string | undefined): MCPCallContext {
  const rawSession = read(CLAUDE_SESSION_HEADER);
  const callerSessionId =
    typeof rawSession === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(rawSession)
      ? rawSession
      : undefined;
  const rawCompany = read(SUPERNAL_COMPANY_HEADER);
  const callerCompanySlug = typeof rawCompany === 'string' ? rawCompany.slice(0, 200) : undefined;
  const rawAgent = read('user-agent');
  const callerUserAgent = typeof rawAgent === 'string' ? rawAgent.slice(0, 200) : undefined;
  return { transport: 'http', callerSessionId, callerCompanySlug, callerUserAgent };
}

/**
 * Same as callContextFromHeaders for a 2026-07-28 request. Fails closed: a request that
 * carries no headers cannot be identified, so it is refused instead of served as anonymous.
 */
export function callContextFromRequestInfo(requestInfo?: {
  headers?: { get(name: string): string | null };
}): MCPCallContext {
  const headers = requestInfo?.headers;
  if (!headers) {
    throw new Error('[mcp-http] request headers unavailable; refusing an unidentified caller.');
  }
  return callContextFromHeaders((name) => headers.get(name) ?? undefined);
}

export async function createMCPServer(
  registry: CommandRegistry,
  config: MCPServerConfig,
  callContext?: MCPCallContext
) {
  const { Server } = await import('@modelcontextprotocol/server');

  const notice = stalenessNotice(config);
  const instructions = [config.instructions, notice].filter(Boolean).join('\n\n');

  const server = new Server(
    { name: config.name, version: config.version },
    {
      capabilities: { tools: {}, ...config.capabilities },
      ...(instructions ? { instructions } : {}),
    }
  );

  server.setRequestHandler('tools/list', async () => ({
    tools: registry.getAll().map((cmd) => {
      const t = cmd.toMCP();
      return { name: t.name, description: t.description, inputSchema: t.inputSchema };
    }),
    // _meta is the standard MCP extension point for out-of-band info; harmless
    // for clients that ignore it, useful for anything that reads it
    // programmatically (e.g. `sc mcp health`) instead of parsing `instructions`.
    ...(notice && config.staleness
      ? {
          _meta: {
            staleness: {
              current: config.version,
              latest: config.staleness.latestVersion,
              updateHint: config.staleness.updateHint,
            },
          },
        }
      : {}),
  }));

  server.setRequestHandler('tools/call', async (request, ctx) => {
    const { name, arguments: args } = request.params;
    const command = registry.findByMCPName(name);
    if (!command) {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      // command.toMCP().execute() already returns the full MCP CallToolResult
      // shape ({ content: [...], isError? }) — return it directly. Re-wrapping
      // it in another { content: [{ text: JSON.stringify(result) }] } layer
      // (the previous behavior here) double-JSON-encodes every tool result.
      // The mapped `extra` carries sessionId + real progress-notification
      // plumbing through to toMCP()'s execute() (see toMCPCallExtra above).
      return (await command
        .toMCP()
        .execute(args ?? {}, { ...toMCPCallExtra(ctx), ...callContext })) as CallToolResult;
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

/**
 * Create an Express app wired for HTTP/SSE MCP transport.
 *
 * Each POST /mcp request gets its own stateless transport instance (stateless mode,
 * sessionIdGenerator: undefined). Compatible with Claude's custom connector format.
 *
 * Also exposes GET /health → { status: 'ok', name, version } for liveness checks
 * (intentionally unauthenticated — no registry access, no sensitive data).
 *
 * Returns the Express app (so callers can add routes) and a `start(port)` convenience
 * method that begins listening and resolves when the server is ready.
 *
 * Works with any CommandRegistry — the whole supernal system or any individual board.
 *
 * ── Security — fail-closed by default ─────────────────────────────────────────
 * Every registered command is reachable over this transport, and command handlers
 * routinely take a `company`/`companySlug` parameter directly from the caller with
 * no independent authorization check (that's the CALLER's job, not the transport's).
 * So the transport itself MUST authenticate every request:
 *   - An auth token is REQUIRED. Pass `options.authToken`, or set the
 *     `MCP_HTTP_TOKEN` env var. If neither is present, `createMCPHttpApp()` throws —
 *     it will NOT silently build an unauthenticated app. Callers who genuinely want
 *     an open (e.g. sandboxed, network-isolated) server must opt in explicitly with
 *     `options.allowUnauthenticated: true`.
 *   - Requests must carry `Authorization: Bearer <token>`; both sides are hashed
 *     (SHA-256) before `timingSafeEqual`, so the comparison is fixed-length and
 *     constant-time regardless of the submitted token's length. `/health` is exempt.
 *   - The server binds to `127.0.0.1` by default — NOT all interfaces — so an
 *     unauthenticated LAN/internet caller can't reach it even if the token check
 *     were somehow bypassed. Pass `options.host` to bind elsewhere (e.g. `0.0.0.0`
 *     behind your own reverse proxy for Claude's remote custom-connector format).
 *   - Combining `allowUnauthenticated: true` with a non-loopback `host` — the exact
 *     configuration this fix exists to prevent — is refused unless you ALSO pass
 *     `options.confirmUnauthenticatedNetworkExposure: true`. Two differently-named
 *     opt-ins can't be set by accidentally copy-pasting one flag.
 *   - A disallowed CORS origin gets a generic 403 (no stack trace), never Express's
 *     default error page.
 *
 * @example
 * const { app, start } = await createMCPHttpApp(
 *   registry,
 *   { name: 'my-server', version: '0.1.0' },
 *   { authToken: randomBytes(32).toString('hex') },
 * );
 * await start(); // listens on 127.0.0.1:3001 by default
 *
 * // Or bring your own port / bind address:
 * await start(4000);
 */
export async function createMCPHttpApp(
  registry: CommandRegistry,
  config: MCPServerConfig,
  options?: {
    port?: number;
    host?: string;
    /** Bearer token required on every request except /health. Falls back to MCP_HTTP_TOKEN env var. */
    authToken?: string;
    /** Explicit, audited opt-out of the fail-closed auth requirement. Default false. */
    allowUnauthenticated?: boolean;
    /**
     * Second, differently-named explicit opt-in required to combine
     * allowUnauthenticated with a non-loopback host. Default false.
     */
    confirmUnauthenticatedNetworkExposure?: boolean;
    /**
     * Which MCP protocol eras POST /mcp serves. 'legacy' (default) answers 2025-era
     * traffic in JSON. 'both' also serves the 2026-07-28 era, and answers 2025-era
     * requests as an event stream.
     */
    protocolEra?: 'legacy' | 'both';
  }
): Promise<{ app: unknown; start: (port?: number) => Promise<void> }> {
  const { timingSafeEqual, createHash } = await import('node:crypto');
  const express = await import('express').then((m) => m.default ?? m);
  const cors = await import('cors').then((m) => m.default ?? m);

  const authToken = options?.authToken ?? process.env.MCP_HTTP_TOKEN;
  const allowUnauthenticated = options?.allowUnauthenticated === true;

  // Fail closed: refuse to build a server that would accept unauthenticated
  // requests unless the caller explicitly opted in. This mirrors the fail-loud
  // pattern used by `sc module serve` (packages/boards/lib/module-server.ts) —
  // no isolation/auth check defaulting silently to "off".
  if (!authToken && !allowUnauthenticated) {
    throw new Error(
      '[mcp-http] refusing to start unauthenticated. Every registered command is ' +
        'reachable over this transport, including any that trust a caller-supplied ' +
        'company/tenant parameter. Pass options.authToken (e.g. ' +
        'randomBytes(32).toString("hex")), or set the MCP_HTTP_TOKEN env var. ' +
        'To run genuinely open (only for a network-isolated/sandboxed deployment), ' +
        'pass options.allowUnauthenticated: true explicitly.'
    );
  }

  const defaultPort = options?.port ?? 3001;
  // Fail closed on network exposure too: bind to loopback only unless the
  // caller explicitly asks for a different interface (e.g. 0.0.0.0 behind
  // their own reverse proxy for Claude's remote custom-connector format).
  const host = options?.host ?? '127.0.0.1';
  const isLoopbackHost = host === '127.0.0.1' || host === 'localhost' || host === '::1';

  // Refuse the exact combination this fix exists to prevent: no auth AND
  // reachable beyond loopback. A SECOND, differently-named opt-in is required
  // so it can never be set by accident (e.g. copy-pasting allowUnauthenticated
  // from a local-dev snippet into a deployment that also sets host: '0.0.0.0').
  if (
    allowUnauthenticated &&
    !isLoopbackHost &&
    options?.confirmUnauthenticatedNetworkExposure !== true
  ) {
    throw new Error(
      `[mcp-http] refusing to bind an UNAUTHENTICATED server to a non-loopback host ("${host}"). ` +
        'This is the exact configuration this fix exists to prevent — every registered command ' +
        'would be reachable by any network caller with zero auth. If you genuinely intend this ' +
        '(e.g. a network-isolated sandbox with no real secrets), also pass ' +
        'options.confirmUnauthenticatedNetworkExposure: true.'
    );
  }

  const protocolEra = options?.protocolEra ?? 'legacy';
  if (protocolEra !== 'legacy' && protocolEra !== 'both') {
    throw new Error(
      `[mcp-http] unknown protocolEra "${String(protocolEra)}"; expected 'legacy' or 'both'.`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expressApp: any = express();
  expressApp.use(
    cors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
      ) => {
        // Non-browser callers (curl, Claude's connector infra) send no Origin header —
        // always allowed. Browser-originated cross-origin calls are restricted to
        // localhost; this transport is not designed to be called from arbitrary
        // third-party web pages.
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS: origin not allowed'));
        }
      },
    })
  );
  expressApp.use(express.json());

  // Health endpoint — verifies the server is alive without MCP client tooling.
  // Registered BEFORE the auth middleware and intentionally unauthenticated: it
  // exposes only non-sensitive liveness info, no registry/command access.
  expressApp.get('/health', (_req: unknown, res: { json: (body: unknown) => void }) => {
    const notice = stalenessNotice(config);
    res.json({
      status: 'ok',
      name: config.name,
      version: config.version,
      ...(notice && config.staleness
        ? { staleness: { current: config.version, latest: config.staleness.latestVersion } }
        : {}),
    });
  });

  // ── Auth middleware — applies to every route registered after this point ──
  // Both sides are hashed to a fixed-length digest before comparison, so there is
  // no length-based early exit and no signal about the submitted token's length.
  if (!allowUnauthenticated) {
    const expected = createHash('sha256')
      .update(authToken as string)
      .digest();
    expressApp.use(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req: any, res: any, next: () => void) => {
        const header = req.headers?.['authorization'] as string | undefined;
        if (!header?.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        const submitted = createHash('sha256').update(header.slice(7)).digest();
        if (!timingSafeEqual(submitted, expected)) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }
        next();
      }
    );
  }

  if (protocolEra === 'legacy') {
    // One transport and one server per request (stateless), answering 2025-era traffic in JSON.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp.post('/mcp', async (req: any, res: any) => {
      const { NodeStreamableHTTPServerTransport } = await import('@modelcontextprotocol/node');
      // JSON-response mode writes only the final result, so a command's `context.stream`
      // progress notifications are not sent over this route (stdio and in-memory still send them).
      const transport = new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      const server = await createMCPServer(
        registry,
        config,
        callContextFromHeaders((name) => {
          const value = req.headers?.[name];
          return typeof value === 'string' ? value : undefined;
        })
      );
      res.on('close', () => transport.close());
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
  } else {
    // One handler serves 2025-era and 2026-07-28 traffic; the factory builds a fresh server per request.
    // 2025-era requests are answered as an event stream, not JSON.
    const { createMcpHandler } = await import('@modelcontextprotocol/server');
    const { toNodeHandler } = await import('@modelcontextprotocol/node');
    const mcpHandler = createMcpHandler((ctx) =>
      createMCPServer(registry, config, callContextFromRequestInfo(ctx.requestInfo))
    );
    const nodeMcp = toNodeHandler(mcpHandler, {
      onerror: (e) =>
        console.error(`[mcp-http] ${config.name}@${config.version} handler error:`, e.message),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expressApp.post('/mcp', (req: any, res: any) => nodeMcp(req, res, req.body));
  }

  // ── Error handler — MUST be registered last (Express matches by arity) ────
  // Catches the CORS-rejection error, a malformed-JSON body from express.json(),
  // and any other error thrown/rejected anywhere in the chain (including the
  // async /mcp handler above) — and returns a stack-trace-free response instead
  // of falling through to Express's default error page (which includes the
  // stack in non-production NODE_ENV). Every error is logged server-side first
  // so a real bug doesn't vanish silently behind a generic client response.
  expressApp.use(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    (err: any, _req: any, res: any, _next: any) => {
      // Log only message/type/status/stack — NEVER the raw err object. body-parser
      // attaches the caller's raw request body as err.body on a JSON parse failure
      // (see http-errors' createError(400, err, { body, type })), and that body may
      // contain a real Bearer token, company slug, or other caller-supplied secret.
      // console.error(err) would print it verbatim to server logs.
      console.error(`[mcp-http] ${config.name}@${config.version} request error:`, {
        message: err?.message,
        type: err?.type,
        status: err?.status ?? err?.statusCode,
        stack: err?.stack,
      });
      if (err instanceof SyntaxError && 'body' in err) {
        // express.json() failed to parse the request body.
        res.status(400).json({ error: 'Bad Request' });
        return;
      }
      if (err?.message === 'CORS: origin not allowed') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      // Anything else is a genuine server-side failure (a bug in a registered
      // command handler, an MCP transport error, etc.) — do not mislabel it as
      // an auth/CORS problem.
      res.status(500).json({ error: 'Internal Server Error' });
    }
  );

  const start = (port?: number): Promise<void> => {
    const listenPort = port ?? defaultPort;
    return new Promise((resolve, reject) => {
      // Node's http.Server#listen callback takes no error argument — errors are
      // only ever delivered via the 'error' event handled below.
      const srv = expressApp.listen(listenPort, host, () => {
        console.log(
          `[mcp-http] ${config.name}@${config.version} listening on http://${host}:${listenPort}/mcp` +
            (allowUnauthenticated ? ' (UNAUTHENTICATED)' : ' (Bearer token required)')
        );
        console.log(`[mcp-http] health: http://${host}:${listenPort}/health`);
        resolve();
      });
      srv.on('error', reject);
    });
  };

  return { app: expressApp, start };
}
