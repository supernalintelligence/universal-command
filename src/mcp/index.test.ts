/**
 * Security-focused tests for createMCPHttpApp.
 *
 * Context: createMCPHttpApp() exposes every command in a CommandRegistry over
 * HTTP (used by @supernal/mcp-server's `npx @supernal/mcp-server serve --http`
 * and multiple board mcp-server.ts entry points for Claude's remote custom
 * connector format). Before this fix it had NO authentication at all and bound
 * to all network interfaces by default — any anonymous network caller could
 * invoke any registered command, including ones that trust a caller-supplied
 * `company`/`companySlug` parameter with no independent check. These tests
 * lock in the fail-closed fix: auth is required by default, /health stays
 * open, and the default bind is loopback-only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { CommandRegistry } from '../CommandRegistry';
import { UniversalCommand } from '../UniversalCommand';
import { createMCPHttpApp, createMCPServer, toMCPCallExtra } from './index';

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(
    new UniversalCommand({
      name: 'echo test',
      description: 'Echoes back the input',
      input: { parameters: [{ name: 'value', type: 'string', required: false }] },
      output: { type: 'json' },
      handler: async (args: { value?: string }) => ({ echoed: args.value ?? null }),
    })
  );
  return registry;
}

const ORIGINAL_ENV_TOKEN = process.env.MCP_HTTP_TOKEN;

beforeEach(() => {
  delete process.env.MCP_HTTP_TOKEN;
});

afterEach(() => {
  if (ORIGINAL_ENV_TOKEN === undefined) {
    delete process.env.MCP_HTTP_TOKEN;
  } else {
    process.env.MCP_HTTP_TOKEN = ORIGINAL_ENV_TOKEN;
  }
});

describe('createMCPHttpApp — fail-closed auth', () => {
  it('throws when no authToken, no MCP_HTTP_TOKEN env var, and no explicit opt-out', async () => {
    await expect(
      createMCPHttpApp(buildRegistry(), { name: 'test', version: '0.0.1' })
    ).rejects.toThrow(/refusing to start unauthenticated/i);
  });

  it('does not throw when options.authToken is provided', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        { authToken: 'secret-token' }
      )
    ).resolves.toBeDefined();
  });

  it('does not throw when MCP_HTTP_TOKEN env var is set', async () => {
    process.env.MCP_HTTP_TOKEN = 'env-secret-token';
    await expect(
      createMCPHttpApp(buildRegistry(), { name: 'test', version: '0.0.1' })
    ).resolves.toBeDefined();
  });

  it('does not throw when allowUnauthenticated is explicitly true', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        { allowUnauthenticated: true }
      )
    ).resolves.toBeDefined();
  });
});

describe('createMCPHttpApp — request-level enforcement', () => {
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  it('rejects /mcp with 401 when no Authorization header is sent', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('rejects /mcp with 401 when the Bearer token is wrong', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-token', 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    } finally {
      await close();
    }
  });

  it('does not 401 /mcp when the Bearer token is correct', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer correct-token',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      // The exact response shape depends on the MCP transport; what matters for
      // this security test is that auth did NOT reject the request.
      expect(res.status).not.toBe(401);
    } finally {
      await close();
    }
  });

  it('/health stays reachable without any Authorization header even when auth is required', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('ok');
    } finally {
      await close();
    }
  });

  it('allows /mcp with no Authorization header when allowUnauthenticated is explicitly set', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { allowUnauthenticated: true }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
      });
      expect(res.status).not.toBe(401);
    } finally {
      await close();
    }
  });
});

describe('createMCPHttpApp — protocol content through the real SDK transport', () => {
  // Unlike the request-level enforcement tests above (which only assert on HTTP
  // status codes), these exercise the actual StreamableHTTPServerTransport +
  // Server round trip and assert on the JSON-RPC response body — so an
  // @modelcontextprotocol/sdk upgrade that silently breaks tool listing or
  // invocation (transport wiring, schema shape, content encoding) fails a test
  // instead of shipping unnoticed.
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  async function mcpRequest(
    url: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${url}/mcp`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer correct-token',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }

  it('tools/list returns the registered command with its real name, description, and input schema', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tools = (body as any).result?.tools;
      expect(Array.isArray(tools)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tool = tools.find((t: any) => t.name === 'sc_echo_test');
      expect(tool).toBeDefined();
      expect(tool.description).toBe('Echoes back the input');
      expect(tool.inputSchema?.properties?.value).toBeDefined();
    } finally {
      await close();
    }
  });

  it('tools/call actually invokes the command handler and returns its real result', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'sc_echo_test', arguments: { value: 'hello-from-test' } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (body as any).result;
      expect(result.isError).toBeFalsy();
      const text = result.content?.[0]?.text;
      expect(JSON.parse(text)).toEqual({ echoed: 'hello-from-test' });
    } finally {
      await close();
    }
  });

  it('tools/call on an unknown tool name returns isError without throwing', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'sc_does_not_exist', arguments: {} },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (body as any).result;
      expect(result.isError).toBe(true);
      expect(result.content?.[0]?.text).toMatch(/Unknown tool/);
    } finally {
      await close();
    }
  });
});

describe('createMCPHttpApp — staleness nudge (config.staleness)', () => {
  // The caller resolves "latest" however fits its deployment (an sc mcp
  // supervisor tick, a build-time check, etc.) and passes it in — these tests
  // only verify createMCPHttpApp/createMCPServer surface it correctly once
  // given, not that any resolution logic exists (there is none, by design).
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  async function mcpRequest(
    url: string,
    body: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${url}/mcp`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer correct-token',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }

  it('surfaces an update nudge via the standard MCP `instructions` field when stale', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      {
        name: 'test',
        version: '1.0.0',
        staleness: { latestVersion: '1.2.0', updateHint: 'Run: sc mcp update test' },
      },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2026-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '0.0.1' },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instructions = (body as any).result?.instructions;
      expect(instructions).toContain('1.0.0');
      expect(instructions).toContain('1.2.0');
      expect(instructions).toContain('Run: sc mcp update test');
    } finally {
      await close();
    }
  });

  it('does not set instructions when latestVersion matches the running version', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '1.0.0', staleness: { latestVersion: '1.0.0' } },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2026-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '0.0.1' },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((body as any).result?.instructions).toBeUndefined();
    } finally {
      await close();
    }
  });

  it('does not set instructions when no staleness config is passed at all', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '1.0.0' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2026-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '0.0.1' },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((body as any).result?.instructions).toBeUndefined();
    } finally {
      await close();
    }
  });

  it('includes machine-readable staleness in tools/list _meta when stale', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      {
        name: 'test',
        version: '1.0.0',
        staleness: { latestVersion: '1.2.0', updateHint: 'Run: sc mcp update test' },
      },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const body = await mcpRequest(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = (body as any).result?._meta;
      expect(meta?.staleness).toEqual({
        current: '1.0.0',
        latest: '1.2.0',
        updateHint: 'Run: sc mcp update test',
      });
    } finally {
      await close();
    }
  });

  it('/health reflects staleness when stale', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '1.0.0', staleness: { latestVersion: '1.2.0' } },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/health`);
      const body = await res.json();
      expect(body.staleness).toEqual({ current: '1.0.0', latest: '1.2.0' });
    } finally {
      await close();
    }
  });
});

describe('createMCPHttpApp — network exposure defaults', () => {
  it('start() binds to 127.0.0.1 by default, not all interfaces', async () => {
    const { app, start } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token', port: 0 }
    );
    let capturedHost: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realListen = (app as any).listen.bind(app);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).listen = (port: number, host: string, cb: (err?: unknown) => void) => {
      capturedHost = host;
      return realListen(port, host, cb);
    };
    await start(0);
    expect(capturedHost).toBe('127.0.0.1');
  });

  it('start() respects an explicit host override', async () => {
    const { app, start } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token', port: 0, host: '0.0.0.0' }
    );
    let capturedHost: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realListen = (app as any).listen.bind(app);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).listen = (port: number, host: string, cb: (err?: unknown) => void) => {
      capturedHost = host;
      return realListen(port, host, cb);
    };
    await start(0);
    expect(capturedHost).toBe('0.0.0.0');
  });
});

describe('createMCPHttpApp — unauthenticated + non-loopback host guard', () => {
  it('throws when allowUnauthenticated is combined with a non-loopback host and no second opt-in', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        { allowUnauthenticated: true, host: '0.0.0.0' }
      )
    ).rejects.toThrow(/refusing to bind an UNAUTHENTICATED server/i);
  });

  it('does not throw when the second opt-in (confirmUnauthenticatedNetworkExposure) is also set', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        {
          allowUnauthenticated: true,
          host: '0.0.0.0',
          confirmUnauthenticatedNetworkExposure: true,
        }
      )
    ).resolves.toBeDefined();
  });

  it('does not throw for allowUnauthenticated with the default (loopback) host', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        { allowUnauthenticated: true }
      )
    ).resolves.toBeDefined();
  });

  it('does not throw for a non-loopback host when auth is required (token set)', async () => {
    await expect(
      createMCPHttpApp(
        buildRegistry(),
        { name: 'test', version: '0.0.1' },
        { authToken: 'correct-token', host: '0.0.0.0' }
      )
    ).resolves.toBeDefined();
  });
});

describe('createMCPHttpApp — CORS rejection does not leak a stack trace', () => {
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  it('returns a generic 403 with no stack trace for a disallowed browser Origin', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          origin: 'https://evil.example.com',
          authorization: 'Bearer correct-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const text = await res.text();
      expect(text).not.toMatch(/at\s+\S+\s+\(.*:\d+:\d+\)/); // no stack-trace-shaped line
      expect(text).not.toContain('node_modules');
      const body = JSON.parse(text);
      expect(body).toEqual({ error: 'Forbidden' });
    } finally {
      await close();
    }
  });
});

describe('createMCPHttpApp — error handler distinguishes error types', () => {
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  it('returns 400 (not 403/500) for a malformed-JSON request body', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: { authorization: 'Bearer correct-token', 'content-type': 'application/json' },
        body: '{not valid json',
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: 'Bad Request' });
    } finally {
      await close();
    }
  });

  it('still returns 403 (not 400/500) for a disallowed CORS origin', async () => {
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: {
          origin: 'https://evil.example.com',
          authorization: 'Bearer correct-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
    } finally {
      await close();
    }
  });
});

describe('createMCPHttpApp — error logging never leaks the raw request body', () => {
  async function listenEphemeral(
    app: unknown
  ): Promise<{ url: string; close: () => Promise<void> }> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
        if (err) {
          reject(err);
          return;
        }
        const { port } = srv.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          close: () => new Promise((res) => srv.close(() => res())),
        });
      });
    });
  }

  it('does not print the raw malformed body (which may contain a secret) to console.error', async () => {
    const SENSITIVE_MARKER = 'SUPER_SECRET_TOKEN_abc123_should_never_be_logged';
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'test', version: '0.0.1' },
      { authToken: 'correct-token' }
    );
    const { url, close } = await listenEphemeral(app);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await fetch(`${url}/mcp`, {
        method: 'POST',
        headers: { authorization: 'Bearer correct-token', 'content-type': 'application/json' },
        body: `{not valid json but contains ${SENSITIVE_MARKER}`,
      });
      expect(res.status).toBe(400);

      // Every argument logged across every console.error call, flattened to one string.
      const loggedText = errorSpy.mock.calls
        .flat()
        .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
        .join(' ');
      expect(loggedText).not.toContain(SENSITIVE_MARKER);
      // Sanity check: the spy actually captured something (the error WAS logged,
      // just without the sensitive body) — otherwise this test would pass vacuously.
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      await close();
    }
  });
});

describe('toMCPCallExtra', () => {
  it('maps sessionId, sendNotification, and _meta straight through', () => {
    const sendNotification = vi.fn(async () => {});
    const mapped = toMCPCallExtra({
      sessionId: 'sess-1',
      sendNotification,
      _meta: { progressToken: 'tok-1', extra: 'field' },
    });

    expect(mapped.sessionId).toBe('sess-1');
    expect(mapped.sendNotification).toBe(sendNotification);
    expect(mapped.meta).toEqual({ progressToken: 'tok-1', extra: 'field' });
  });

  it('produces an all-undefined mapping when called with no extra', () => {
    const mapped = toMCPCallExtra(undefined);

    expect(mapped.sessionId).toBeUndefined();
    expect(mapped.sendNotification).toBeUndefined();
    expect(mapped.meta).toBeUndefined();
  });
});

describe('createMCPServer — real MCP progress notifications end-to-end', () => {
  // Exercises the full real stack (no mocked transport): a real SDK Client
  // and Server connected over InMemoryTransport, a real tools/call with an
  // onprogress callback (which makes the Client auto-populate
  // `_meta.progressToken` — see @modelcontextprotocol/sdk's
  // shared/protocol.ts request()), and asserts the client actually receives
  // progress notifications for a streaming command's chunks. This is the
  // strongest verification that toMCP()'s streaming fix (P0-4) is wired
  // correctly against the real SDK, not just a hand-built fake `extra`.
  function buildStreamingRegistry(chunks: string[]): CommandRegistry {
    const registry = new CommandRegistry();
    registry.register(
      new UniversalCommand({
        name: 'stream test',
        description: 'Streams chunks then returns a result',
        input: { parameters: [] },
        output: { type: 'stream' },
        handler: async (_args, context) => {
          for (const chunk of chunks) {
            context.stream!.write(chunk);
          }
          return { streamed: chunks.length };
        },
      })
    );
    return registry;
  }

  it('delivers one real progress notification per chunk, then the final JSON result', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = await createMCPServer(buildStreamingRegistry(['first', 'second', 'third']), {
      name: 'progress-test-server',
      version: '0.0.1',
    });
    const client = new Client({ name: 'progress-test-client', version: '0.0.1' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      const progressUpdates: Array<{ progress: number; message?: string }> = [];
      const result = await client.callTool({ name: 'sc_stream_test', arguments: {} }, undefined, {
        onprogress: (p: { progress: number; message?: string }) => {
          progressUpdates.push({ progress: p.progress, message: p.message });
        },
      });

      expect(progressUpdates).toEqual([
        { progress: 1, message: 'first' },
        { progress: 2, message: 'second' },
        { progress: 3, message: 'third' },
      ]);

      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text;
      expect(JSON.parse(text as string)).toEqual({ streamed: 3 });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('still returns a single final result with no progress notifications when the caller does not ask for progress', async () => {
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = await createMCPServer(buildStreamingRegistry(['a', 'b']), {
      name: 'progress-test-server-2',
      version: '0.0.1',
    });
    const client = new Client({ name: 'progress-test-client-2', version: '0.0.1' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    try {
      // No onprogress option — the client never sets _meta.progressToken, so
      // this exercises the exact prior (non-streaming) behavior end-to-end.
      const result = await client.callTool({ name: 'sc_stream_test', arguments: {} });

      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text;
      expect(JSON.parse(text as string)).toEqual({ streamed: 2 });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('a failing sendNotification never becomes an uncaught exception (crash-bug regression, 2026-08-30)', async () => {
    // Adversarial review found: the internal Writable's write callback
    // correctly forwards a sendNotification rejection to streamToFinish.end()'s
    // callback, but Node ALSO emits a separate 'error' event on that Writable
    // whenever a write callback receives an error — and with no 'error'
    // listener attached, that event was an uncaught exception, capable of
    // crashing the whole process (every other in-flight MCP request included),
    // not just this one call. Reproduce by closing the client transport mid-
    // stream so a later write's sendNotification call rejects, and assert the
    // process-level 'uncaughtException' handler is never invoked.
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => uncaught.push(err);
    process.on('uncaughtException', onUncaught);

    try {
      const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const registry = new CommandRegistry();
      let handlerDone: () => void = () => {};
      const handlerFinished = new Promise<void>((resolve) => {
        handlerDone = resolve;
      });
      registry.register(
        new UniversalCommand({
          name: 'stream crash test',
          description: 'Writes a chunk after the client has disconnected',
          input: { parameters: [] },
          output: { type: 'stream' },
          handler: async (_args, context) => {
            // Give the test time to close the client transport before this
            // write fires, so its sendNotification call has a real transport
            // to fail against.
            await new Promise((r) => setTimeout(r, 20));
            context.stream!.write('this write races a closed transport');
            handlerDone();
            return { streamed: 1 };
          },
        })
      );
      const server = await createMCPServer(registry, {
        name: 'crash-test-server',
        version: '0.0.1',
      });
      const client = new Client({ name: 'crash-test-client', version: '0.0.1' });

      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const callPromise = client
        .callTool({ name: 'sc_stream_crash_test', arguments: {} }, undefined, {
          onprogress: () => {},
        })
        .catch((err: unknown) => err); // either outcome is fine, we're testing for no crash

      await client.close();
      await handlerFinished;
      await callPromise;
      await server.close();

      expect(uncaught).toEqual([]);
    } finally {
      process.off('uncaughtException', onUncaught);
    }
  });
});

describe('createMCPServer — instructions option', () => {
  it('joins config.instructions with the staleness notice and passes capabilities through', async () => {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
    const server = await createMCPServer(buildRegistry(), {
      name: 'test',
      version: '1.0.0',
      instructions: 'Messages arrive as <channel> turns.',
      staleness: { latestVersion: '1.2.0' },
      capabilities: { experimental: { 'claude/channel': {} } },
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'c', version: '0' });
    await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
    const instructions = client.getInstructions() ?? '';
    expect(instructions.startsWith('Messages arrive as <channel> turns.')).toBe(true);
    expect(instructions).toContain('1.2.0');
    expect(client.getServerCapabilities()).toMatchObject({
      tools: {},
      experimental: { 'claude/channel': {} },
    });
    await client.close();
  });
});
