import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AddressInfo } from 'node:net';
import { CommandRegistry } from '../CommandRegistry';
import { UniversalCommand } from '../UniversalCommand';
import { createMCPHttpApp } from './index';
import { resolveContextCompanyLock, setUnidentifiedCallerPolicy } from '../session-tenancy';
import { __setAgentProbeForTest, __setTrustedHomeForTest } from '../session-tenancy/trust';

const TOKEN = 'tenancy-test-token';

type Probe = { callerSessionId?: string; callerCompanySlug?: string; lock: unknown };
type Era = 'legacy' | 'both';
type Caller = 'raw 2025-era request' | 'client pinned to 2026-07-28';

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(
    new UniversalCommand({
      name: 'whose lock',
      description: 'Reports the company lock the transport identity resolves to',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async (_args, context) => ({
        callerSessionId: context.callerSessionId,
        callerCompanySlug: context.callerCompanySlug,
        lock: resolveContextCompanyLock(context),
      }),
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

async function callRaw(url: string, identity: Record<string, string>): Promise<Probe> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...identity,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'sc_whose_lock', arguments: {} },
    }),
  });
  const text = await res.text();
  const payload = res.headers.get('content-type')?.includes('text/event-stream')
    ? (text.split('\n').find((l) => l.startsWith('data:')) ?? '').slice(5).trim()
    : text;
  const body = JSON.parse(payload) as { result: { content: Array<{ text: string }> } };
  return JSON.parse(body.result.content[0].text) as Probe;
}

async function callModern(url: string, identity: Record<string, string>): Promise<Probe> {
  const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');
  const client = new Client(
    { name: 'tenancy-client', version: '0.0.1' },
    { versionNegotiation: { mode: { pin: '2026-07-28' } } }
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { authorization: `Bearer ${TOKEN}`, ...identity } },
    })
  );
  try {
    expect(client.getProtocolEra()).toBe('modern');
    const result = (await client.callTool({ name: 'sc_whose_lock', arguments: {} })) as {
      content: Array<{ text: string }>;
    };
    return JSON.parse(result.content[0].text) as Probe;
  } finally {
    await client.close();
  }
}

const UNIDENTIFIED = { tier: 'unidentified', companySlug: null };

// The route table the transport must keep across the SDK swap and across both protocol eras.
// Rows are (caller identity headers) -> (identity the handler sees, company lock it resolves to).
// Sessions sess-acme and sess-beta have trusted session records naming those companies.
const ROWS: Array<{ name: string; headers: Record<string, string>; expect: Probe }> = [
  {
    name: 'tenant A: a session record names acme',
    headers: { 'x-claude-session-id': 'sess-acme' },
    expect: { callerSessionId: 'sess-acme', lock: { tier: 'locked', companySlug: 'acme' } },
  },
  {
    name: 'tenant B: a session record names beta',
    headers: { 'x-claude-session-id': 'sess-beta' },
    expect: { callerSessionId: 'sess-beta', lock: { tier: 'locked', companySlug: 'beta' } },
  },
  {
    name: 'a company header equal to the session lock is allowed',
    headers: { 'x-claude-session-id': 'sess-acme', 'x-supernal-company-slug': 'acme' },
    expect: {
      callerSessionId: 'sess-acme',
      callerCompanySlug: 'acme',
      lock: { tier: 'locked', companySlug: 'acme' },
    },
  },
  {
    name: 'a company header naming the other tenant is refused, not chosen',
    headers: { 'x-claude-session-id': 'sess-acme', 'x-supernal-company-slug': 'beta' },
    expect: { callerCompanySlug: 'beta', lock: UNIDENTIFIED },
  },
  {
    name: 'a session that drops its session header cannot pick the other tenant by company header',
    headers: { 'x-supernal-company-slug': 'beta' },
    expect: { callerCompanySlug: 'beta', lock: UNIDENTIFIED },
  },
  {
    name: 'a company header with a malformed session header supplies no company',
    headers: { 'x-supernal-company-slug': 'acme', 'x-claude-session-id': 'bad id with spaces' },
    expect: { callerCompanySlug: 'acme', lock: UNIDENTIFIED },
  },
  {
    name: 'duplicate session headers (joined as "a, b") are dropped and stay unidentified',
    headers: { 'x-claude-session-id': 'sess-acme, sess-beta' },
    expect: { lock: UNIDENTIFIED },
  },
  {
    name: 'duplicate company headers (joined as "a, b") are refused',
    headers: { 'x-claude-session-id': 'sess-acme', 'x-supernal-company-slug': 'acme, beta' },
    expect: { callerCompanySlug: 'acme, beta', lock: UNIDENTIFIED },
  },
  {
    name: 'unidentified caller (no identity headers)',
    headers: {},
    expect: { lock: UNIDENTIFIED },
  },
  {
    name: 'malformed company header is refused, not treated as absent',
    headers: { 'x-supernal-company-slug': 'bad slug!' },
    expect: { callerCompanySlug: 'bad slug!', lock: UNIDENTIFIED },
  },
  {
    name: 'malformed session header is dropped and stays unidentified',
    headers: { 'x-claude-session-id': 'bad id with spaces' },
    expect: { lock: UNIDENTIFIED },
  },
  {
    name: 'a session id with no trusted record is refused',
    headers: { 'x-claude-session-id': 'sess-unknown' },
    expect: { callerSessionId: 'sess-unknown', lock: UNIDENTIFIED },
  },
];

const VARIANTS: Array<[Era, Caller]> = [
  ['legacy', 'raw 2025-era request'],
  ['both', 'raw 2025-era request'],
  ['both', 'client pinned to 2026-07-28'],
];

describe('createMCPHttpApp: two-tenant route table over every transport era', () => {
  const savedEnv = {
    slug: process.env['SUPERNAL_COMPANY_SLUG'],
    id: process.env['MODULE_COMPANY_ID'],
    home: process.env['SUPERNAL_HOME'],
  };
  let close: (() => Promise<void>) | undefined;
  let home: string;

  function writeSidecar(sessionId: string, companySlug: string): void {
    const dir = path.join(home, 'board-sessions', 'session-map');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${sessionId}.json`),
      JSON.stringify({ tier: 'board', companySlug })
    );
  }

  beforeEach(() => {
    delete process.env['SUPERNAL_COMPANY_SLUG'];
    delete process.env['MODULE_COMPANY_ID'];
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-tenancy-'));
    process.env['SUPERNAL_HOME'] = home;
    __setTrustedHomeForTest(home);
    __setAgentProbeForTest(() => false);
    writeSidecar('sess-acme', 'acme');
    writeSidecar('sess-beta', 'beta');
    setUnidentifiedCallerPolicy('refuse');
  });
  afterEach(async () => {
    await close?.();
    close = undefined;
    setUnidentifiedCallerPolicy('refuse');
    __setTrustedHomeForTest(undefined);
    __setAgentProbeForTest(undefined);
    fs.rmSync(home, { recursive: true, force: true });
    for (const [key, value] of [
      ['SUPERNAL_COMPANY_SLUG', savedEnv.slug],
      ['MODULE_COMPANY_ID', savedEnv.id],
      ['SUPERNAL_HOME', savedEnv.home],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  for (const [era, caller] of VARIANTS) {
    describe(`protocolEra '${era}', ${caller}`, () => {
      for (const row of ROWS) {
        it(row.name, async () => {
          const { app } = await createMCPHttpApp(
            buildRegistry(),
            { name: 'tenancy-server', version: '0.0.1' },
            { authToken: TOKEN, protocolEra: era }
          );
          const srv = await listen(app);
          close = srv.close;
          const seen =
            caller === 'raw 2025-era request'
              ? await callRaw(srv.url, row.headers)
              : await callModern(srv.url, row.headers);
          expect(seen).toMatchObject(row.expect);
        });
      }
    });
  }

  it("the 'platform' policy lets a company header narrow a caller with no session identity", async () => {
    setUnidentifiedCallerPolicy('platform');
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'tenancy-server', version: '0.0.1' },
      { authToken: TOKEN }
    );
    const srv = await listen(app);
    close = srv.close;
    const seen = await callRaw(srv.url, { 'x-supernal-company-slug': 'beta' });
    expect(seen.lock).toMatchObject({ tier: 'locked', companySlug: 'beta' });
  });
});

describe("createMCPHttpApp protocolEra 'both': open streams and shutdown", () => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it('refuses subscriptions/listen, since this server publishes no change events', async () => {
    const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 'tenancy-server', version: '0.0.1' },
      { authToken: TOKEN, protocolEra: 'both' }
    );
    const srv = await listen(app);
    close = srv.close;
    const client = new Client(
      { name: 'tenancy-client', version: '0.0.1' },
      { versionNegotiation: { mode: { pin: '2026-07-28' } } }
    );
    await client.connect(
      new StreamableHTTPClientTransport(new URL(srv.url), {
        requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
      })
    );
    try {
      await expect(client.listen({ toolsListChanged: true })).rejects.toThrow(/limit/i);
    } finally {
      await client.close();
    }
  });

  it('returns a close() that tears down the handler for both eras and can be called twice', async () => {
    for (const protocolEra of ['legacy', 'both'] as const) {
      const { close: closeApp } = await createMCPHttpApp(
        buildRegistry(),
        { name: 'tenancy-server', version: '0.0.1' },
        { authToken: TOKEN, protocolEra }
      );
      await closeApp();
      await closeApp();
    }
  });
});
