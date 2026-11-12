import { describe, it, expect, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { CommandRegistry } from '../CommandRegistry';
import { UniversalCommand } from '../UniversalCommand';
import { createMCPHttpApp, callContextFromRequestInfo } from './index';

const TOKEN = 'era-test-token';

type Seen = { sessionId?: string; companySlug?: string };

function registryRecording(seen: Seen[]): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(
    new UniversalCommand({
      name: 'who am i',
      description: 'Reports the caller identity the transport asserted',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async (_args, context) => {
        seen.push({ sessionId: context.callerSessionId, companySlug: context.callerCompanySlug });
        return { ok: true };
      },
    })
  );
  return registry;
}

async function listen(app: unknown): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const srv = (app as any).listen(0, '127.0.0.1', (err?: unknown) => {
      if (err) return reject(err);
      const { port } = srv.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/mcp`,
        close: () => new Promise((res) => srv.close(() => res())),
      });
    });
  });
}

describe("createMCPHttpApp with protocolEra 'both' serves both protocol eras with the same caller identity", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  const modes: Array<[string, unknown, 'legacy' | 'modern']> = [
    ['default handshake', undefined, 'legacy'],
    ['auto negotiation', { mode: 'auto' }, 'modern'],
    ['pinned 2026-07-28', { mode: { pin: '2026-07-28' } }, 'modern'],
  ];

  for (const [label, versionNegotiation, era] of modes) {
    it(`${label}: negotiates ${era} and delivers the session and company headers to the handler`, async () => {
      const { Client, StreamableHTTPClientTransport } =
        await import('@modelcontextprotocol/client');
      const seen: Seen[] = [];
      const { app } = await createMCPHttpApp(
        registryRecording(seen),
        { name: 'era-server', version: '0.0.1' },
        { authToken: TOKEN, protocolEra: 'both' }
      );
      const srv = await listen(app);
      close = srv.close;

      const client = new Client(
        { name: 'era-client', version: '0.0.1' },
        versionNegotiation ? { versionNegotiation } : {}
      );
      await client.connect(
        new StreamableHTTPClientTransport(new URL(srv.url), {
          requestInit: {
            headers: {
              authorization: `Bearer ${TOKEN}`,
              'x-claude-session-id': 'sess_abc-123',
              'x-supernal-company-slug': 'acme',
            },
          },
        })
      );
      try {
        expect(client.getProtocolEra()).toBe(era);
        const tools = await client.listTools();
        expect(tools.tools.map((t) => t.name)).toContain('sc_who_am_i');
        await client.callTool({ name: 'sc_who_am_i', arguments: {} });
        expect(seen).toEqual([{ sessionId: 'sess_abc-123', companySlug: 'acme' }]);
      } finally {
        await client.close();
      }
    });
  }

  it('drops a malformed session id and still refuses a request with no bearer token', async () => {
    const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');
    const seen: Seen[] = [];
    const { app } = await createMCPHttpApp(
      registryRecording(seen),
      { name: 'era-server', version: '0.0.1' },
      { authToken: TOKEN, protocolEra: 'both' }
    );
    const srv = await listen(app);
    close = srv.close;

    const noAuth = await fetch(srv.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(noAuth.status).toBe(401);

    const client = new Client(
      { name: 'era-client', version: '0.0.1' },
      { versionNegotiation: { mode: 'auto' } }
    );
    await client.connect(
      new StreamableHTTPClientTransport(new URL(srv.url), {
        requestInit: {
          headers: {
            authorization: `Bearer ${TOKEN}`,
            'x-claude-session-id': 'bad id with spaces',
          },
        },
      })
    );
    try {
      await client.callTool({ name: 'sc_who_am_i', arguments: {} });
      expect(seen).toEqual([{ sessionId: undefined, companySlug: undefined }]);
    } finally {
      await client.close();
    }
  });
});

describe('createMCPHttpApp default (legacy) era', () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  async function legacyApp(seen: Seen[]) {
    const { app } = await createMCPHttpApp(
      registryRecording(seen),
      { name: 'era-server', version: '0.0.1' },
      { authToken: TOKEN }
    );
    const srv = await listen(app);
    close = srv.close;
    return srv;
  }

  const headers = {
    authorization: `Bearer ${TOKEN}`,
    'x-claude-session-id': 'sess_abc-123',
    'x-supernal-company-slug': 'acme',
  };

  it('answers a raw 2025-era request as JSON, not an event stream', async () => {
    const srv = await legacyApp([]);
    const res = await fetch(srv.url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('answers server/discover with method-not-found so a 2026-07-28 client can fall back', async () => {
    const srv = await legacyApp([]);
    const res = await fetch(srv.url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'server/discover' }),
    });
    const body = (await res.json()) as { id: number; error: { code: number } };
    expect(body.id).toBe(7);
    expect(body.error.code).toBe(-32601);
  });

  for (const [label, versionNegotiation] of [
    ['default handshake', undefined],
    ['auto negotiation', { mode: 'auto' }],
  ] as const) {
    it(`${label}: negotiates the legacy era and delivers the identity headers`, async () => {
      const { Client, StreamableHTTPClientTransport } =
        await import('@modelcontextprotocol/client');
      const seen: Seen[] = [];
      const srv = await legacyApp(seen);
      const client = new Client(
        { name: 'era-client', version: '0.0.1' },
        versionNegotiation ? { versionNegotiation } : {}
      );
      await client.connect(
        new StreamableHTTPClientTransport(new URL(srv.url), { requestInit: { headers } })
      );
      try {
        expect(client.getProtocolEra()).toBe('legacy');
        await client.callTool({ name: 'sc_who_am_i', arguments: {} });
        expect(seen).toEqual([{ sessionId: 'sess_abc-123', companySlug: 'acme' }]);
      } finally {
        await client.close();
      }
    });
  }

  it('a client pinned to 2026-07-28 cannot connect, so the new era is never served by accident', async () => {
    const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');
    const srv = await legacyApp([]);
    const client = new Client(
      { name: 'era-client', version: '0.0.1' },
      { versionNegotiation: { mode: { pin: '2026-07-28' } } }
    );
    await expect(
      client.connect(
        new StreamableHTTPClientTransport(new URL(srv.url), { requestInit: { headers } })
      )
    ).rejects.toThrow();
    await client.close().catch(() => {});
  });

  it('refuses an unknown protocolEra value', async () => {
    await expect(
      createMCPHttpApp(
        registryRecording([]),
        { name: 'era-server', version: '0.0.1' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { authToken: TOKEN, protocolEra: 'modern' as any }
      )
    ).rejects.toThrow(/unknown protocolEra/);
  });
});

describe('callContextFromRequestInfo fails closed', () => {
  it('refuses a request with no headers instead of serving it as anonymous', () => {
    expect(() => callContextFromRequestInfo(undefined)).toThrow(/refusing an unidentified caller/);
    expect(() => callContextFromRequestInfo({})).toThrow(/refusing an unidentified caller/);
  });

  it('passes a malformed company header through so the tenancy resolver can refuse it', () => {
    const headers = new Headers({ 'x-supernal-company-slug': 'bad slug!' });
    expect(callContextFromRequestInfo({ headers })).toMatchObject({
      transport: 'http',
      callerCompanySlug: 'bad slug!',
      callerSessionId: undefined,
    });
  });

  it('keeps a company-locked caller whose company header is missing unlocked, so the policy refuses it', () => {
    const headers = new Headers({ 'x-claude-session-id': 'sess_abc-123' });
    expect(callContextFromRequestInfo({ headers })).toMatchObject({
      callerSessionId: 'sess_abc-123',
      callerCompanySlug: undefined,
    });
  });
});
