import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { CommandRegistry } from '../CommandRegistry';
import { UniversalCommand } from '../UniversalCommand';
import { createMCPHttpApp } from './index';
import { resolveContextCompanyLock, setUnidentifiedCallerPolicy } from '../session-tenancy';

const TOKEN = 'tenancy-test-token';

type Probe = { callerSessionId?: string; callerCompanySlug?: string; lock: unknown };

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

async function callWhoseLock(url: string, identity: Record<string, string>): Promise<Probe> {
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

// The route table the transport must keep across the SDK swap. Rows are
// (caller identity headers) -> (identity the handler sees, company lock it resolves to).
const ROWS: Array<{
  name: string;
  headers: Record<string, string>;
  expect: Probe;
}> = [
  {
    name: 'tenant A',
    headers: { 'x-supernal-company-slug': 'acme' },
    expect: {
      callerCompanySlug: 'acme',
      lock: { tier: 'locked', companySlug: 'acme' },
    },
  },
  {
    name: 'tenant B',
    headers: { 'x-supernal-company-slug': 'beta' },
    expect: {
      callerCompanySlug: 'beta',
      lock: { tier: 'locked', companySlug: 'beta' },
    },
  },
  {
    name: 'unidentified caller (no identity headers)',
    headers: {},
    expect: { lock: { tier: 'unidentified', companySlug: null } },
  },
  {
    name: 'malformed company header is refused, not treated as absent',
    headers: { 'x-supernal-company-slug': 'bad slug!' },
    expect: {
      callerCompanySlug: 'bad slug!',
      lock: { tier: 'unidentified', companySlug: null },
    },
  },
  {
    name: 'malformed session header is dropped and stays unidentified',
    headers: { 'x-claude-session-id': 'bad id with spaces' },
    expect: { lock: { tier: 'unidentified', companySlug: null } },
  },
  {
    name: 'company header with a malformed session header still locks to the company',
    headers: { 'x-supernal-company-slug': 'acme', 'x-claude-session-id': 'bad id with spaces' },
    expect: {
      callerCompanySlug: 'acme',
      lock: { tier: 'locked', companySlug: 'acme' },
    },
  },
];

describe('createMCPHttpApp — two-tenant route table over the legacy transport', () => {
  const savedEnv = {
    slug: process.env['SUPERNAL_COMPANY_SLUG'],
    id: process.env['MODULE_COMPANY_ID'],
  };
  let close: (() => Promise<void>) | undefined;

  beforeEach(() => {
    delete process.env['SUPERNAL_COMPANY_SLUG'];
    delete process.env['MODULE_COMPANY_ID'];
    setUnidentifiedCallerPolicy('refuse');
  });
  afterEach(async () => {
    await close?.();
    close = undefined;
    if (savedEnv.slug !== undefined) process.env['SUPERNAL_COMPANY_SLUG'] = savedEnv.slug;
    if (savedEnv.id !== undefined) process.env['MODULE_COMPANY_ID'] = savedEnv.id;
  });

  for (const row of ROWS) {
    it(row.name, async () => {
      const { app } = await createMCPHttpApp(
        buildRegistry(),
        { name: 'tenancy-server', version: '0.0.1' },
        { authToken: TOKEN }
      );
      const srv = await listen(app);
      close = srv.close;
      const seen = await callWhoseLock(srv.url, row.headers);
      expect(seen).toMatchObject(row.expect);
    });
  }
});
