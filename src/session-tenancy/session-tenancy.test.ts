import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __setAgentProbeForTest, __setTrustedHomeForTest } from './trust';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AddressInfo } from 'node:net';
import { UniversalCommand, setExecutionScope, setTenancyGuard } from '../UniversalCommand';
import { CommandRegistry } from '../CommandRegistry';
import { createMCPHttpApp } from '../mcp';
import {
  createSessionTenancyGuard,
  currentCompanyLock,
  isAgentContext,
  isAgentProcess,
  resetSessionLogDedupe,
  resolveCompanyLockFor,
  resolveContextCompanyLock,
  sessionExecutionScope,
  setUnidentifiedCallerPolicy,
} from './index';

const ENV_KEYS = [
  'SUPERNAL_HOME',
  'SUPERNAL_COMPANY_SLUG',
  'CLAUDE_CODE_SESSION_ID',
  'MODULE_COMPANY_ID',
] as const;
const saved: Record<string, string | undefined> = {};
let home: string;

function writeSidecar(sessionId: string, entry: Record<string, unknown>): void {
  const dir = path.join(home, 'board-sessions', 'session-map');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${sessionId}.json`), JSON.stringify(entry));
}

function buildRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry.register(
    new UniversalCommand({
      name: 'scoped write',
      description: 'company-scoped',
      tenancy: { companyParam: 'company' },
      input: { parameters: [{ name: 'company', type: 'string', required: false }] },
      output: { type: 'json' },
      handler: async (args: { company?: string }) => ({ company: args.company ?? null }),
    })
  );
  registry.register(
    new UniversalCommand({
      name: 'lock probe',
      description: 'company-less; reports the lock the storage layer would see',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => currentCompanyLock(),
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
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => srv.close(() => res())),
      });
    });
  });
}

async function callTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
  sessionId?: string,
  extraHeaders: Record<string, string> = {}
): Promise<{ isError?: boolean; text: string }> {
  const headers: Record<string, string> = {
    authorization: 'Bearer t',
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    ...extraHeaders,
  };
  if (sessionId !== undefined) headers['x-claude-session-id'] = sessionId;
  const res = await fetch(`${url}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await res.json();
  return {
    isError: body.result?.isError,
    text: body.result?.content?.[0]?.text ?? JSON.stringify(body),
  };
}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'session-tenancy-'));
  process.env['SUPERNAL_HOME'] = home;
  __setTrustedHomeForTest(home);
  __setAgentProbeForTest(() => false);
  resetSessionLogDedupe();
  setUnidentifiedCallerPolicy('refuse');
});

function readLog(): Array<Record<string, unknown>> {
  const file = path.join(home, 'board-sessions', 'session-log.ndjson');
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

afterEach(() => {
  __setTrustedHomeForTest(undefined);
  __setAgentProbeForTest(undefined);
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('session tenancy over the MCP HTTP transport', () => {
  let url: string;
  let close: () => Promise<void>;

  beforeAll(async () => {
    setTenancyGuard(createSessionTenancyGuard());
    setExecutionScope(sessionExecutionScope);
    const { app } = await createMCPHttpApp(
      buildRegistry(),
      { name: 't', version: '0' },
      { authToken: 't' }
    );
    ({ url, close } = await listen(app));
  });

  afterAll(async () => {
    setTenancyGuard(null);
    setExecutionScope(null);
    await close();
  });

  it('refuses another company for a session locked to A', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, 'sess-a');
    expect(res.isError).toBe(true);
    expect(res.text).toContain("locked to company 'a'");
  });

  it('allows the locked company itself', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' }, 'sess-a');
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.text)).toEqual({ company: 'a' });
  });

  it('fills an omitted company with the locked company', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const res = await callTool(url, 'sc_scoped_write', {}, 'sess-a');
    expect(JSON.parse(res.text)).toEqual({ company: 'a' });
  });

  it('refuses a company-scoped call with no session header, even with a company', async () => {
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' });
    expect(res.isError).toBe(true);
    expect(res.text).toContain('X-Claude-Session-Id');
  });

  it('treats a malformed (path-like) session header as missing', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' }, '../session-map/sess-a');
    expect(res.isError).toBe(true);
    expect(res.text).toContain('X-Claude-Session-Id');
  });

  it('binds the request lock for company-less commands, ignoring the daemon env', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    expect(JSON.parse((await callTool(url, 'sc_lock_probe', {}, 'sess-a')).text)).toEqual({
      tier: 'locked',
      companySlug: 'a',
    });
    expect(JSON.parse((await callTool(url, 'sc_lock_probe', {})).text)).toEqual({
      tier: 'unidentified',
      companySlug: null,
    });
  });

  it('a session id with no trusted record is refused, not treated as an operator', async () => {
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, 'sess-operator');
    expect(res.text).toMatch(/no trusted session record|Refused/);
  });

  it('a platform-tier record is the operator session', async () => {
    writeSidecar('sess-platform', { tier: 'platform', companySlug: null });
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, 'sess-platform');
    expect(JSON.parse(res.text)).toEqual({ company: 'b' });
  });

  it("'platform' policy: an unidentified caller keeps today's behavior and is logged, without content", async () => {
    setUnidentifiedCallerPolicy('platform');
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, undefined, {
      'user-agent': 'claude-code/test',
    });
    expect(JSON.parse(res.text)).toEqual({ company: 'b' });
    expect(JSON.parse((await callTool(url, 'sc_lock_probe', {})).text)).toEqual({
      tier: 'platform',
      companySlug: null,
      unidentified: true,
    });
    const entries = readLog().filter((e) => e['event'] === 'unidentified-caller');
    expect(entries[0]).toMatchObject({
      tier: 'unidentified',
      policy: 'platform',
      allowed: true,
      tool: 'sc_scoped_write',
      userAgent: 'claude-code/test',
    });
    expect(JSON.stringify(entries)).not.toContain('"b"');
  });

  it("'refuse' policy: an unidentified caller is refused and logged", async () => {
    setUnidentifiedCallerPolicy('refuse');
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' });
    expect(res.isError).toBe(true);
    expect(
      readLog().some((e) => e['event'] === 'unidentified-caller' && e['policy'] === 'refuse')
    ).toBe(true);
  });

  it('rate-limits unidentified-caller log lines per caller', async () => {
    setUnidentifiedCallerPolicy('platform');
    for (let i = 0; i < 3; i++)
      await callTool(url, 'sc_lock_probe', {}, undefined, { 'user-agent': 'ua-1' });
    expect(readLog().filter((e) => e['event'] === 'unidentified-caller')).toHaveLength(1);
  });

  it('X-Supernal-Company-Slug locks a caller with no session id', async () => {
    setUnidentifiedCallerPolicy('platform');
    const hdr = { 'x-supernal-company-slug': 'a' };
    expect(JSON.parse((await callTool(url, 'sc_lock_probe', {}, undefined, hdr)).text)).toEqual({
      tier: 'locked',
      companySlug: 'a',
    });
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, undefined, hdr);
    expect(res.isError).toBe(true);
    expect(res.text).toContain("locked to company 'a'");
  });

  it('X-Supernal-Company-Slug never unlocks: it locks an operator session too', async () => {
    const res = await callTool(url, 'sc_scoped_write', { company: 'b' }, 'sess-operator', {
      'x-supernal-company-slug': 'a',
    });
    expect(res.isError).toBe(true);
  });

  it('a malformed company header is refused even under the platform policy', async () => {
    setUnidentifiedCallerPolicy('platform');
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' }, 'sess-operator', {
      'x-supernal-company-slug': '../a',
    });
    expect(res.isError).toBe(true);
  });

  it('X-Supernal-Company-Slug naming another company than a sidecar lock is refused, not chosen', async () => {
    setUnidentifiedCallerPolicy('platform');
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const hdr = { 'x-supernal-company-slug': 'b' };
    for (const company of ['a', 'b']) {
      const res = await callTool(url, 'sc_scoped_write', { company }, 'sess-a', hdr);
      expect(res.isError, company).toBe(true);
      expect(res.text).toContain("conflicts with this session's lock to company 'a'");
    }
    expect(
      JSON.parse((await callTool(url, 'sc_lock_probe', {}, 'sess-a', hdr)).text)
    ).toMatchObject({
      tier: 'unidentified',
      companySlug: null,
    });
    expect(readLog().some((e) => e['event'] === 'company-header-conflict')).toBe(true);
  });

  it('X-Supernal-Company-Slug naming another company than SUPERNAL_COMPANY_SLUG is refused', async () => {
    process.env['SUPERNAL_COMPANY_SLUG'] = 'a';
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' }, undefined, {
      'x-supernal-company-slug': 'b',
    });
    expect(res.isError).toBe(true);
    expect(res.text).toContain("lock to company 'a'");
  });

  it('X-Supernal-Company-Slug equal to the existing lock is allowed', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    const hdr = { 'x-supernal-company-slug': 'a' };
    const res = await callTool(url, 'sc_scoped_write', { company: 'a' }, 'sess-a', hdr);
    expect(JSON.parse(res.text)).toEqual({ company: 'a' });
    process.env['SUPERNAL_COMPANY_SLUG'] = 'a';
    const res2 = await callTool(url, 'sc_scoped_write', { company: 'a' }, undefined, hdr);
    expect(JSON.parse(res2.text)).toEqual({ company: 'a' });
  });

  it('logs denials every time but an allowed touch only once per session/company', async () => {
    writeSidecar('sess-a', { tier: 'board', companySlug: 'a' });
    for (let i = 0; i < 3; i++) await callTool(url, 'sc_scoped_write', { company: 'a' }, 'sess-a');
    for (let i = 0; i < 2; i++) await callTool(url, 'sc_scoped_write', { company: 'b' }, 'sess-a');
    const touches = readLog().filter((e) => e['event'] === 'company-touch');
    expect(touches.filter((e) => e['allowed'] === true)).toHaveLength(1);
    expect(touches.filter((e) => e['allowed'] === false)).toHaveLength(2);
    const changes = readLog().filter((e) => e['event'] === 'tier-change');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      claudeSessionId: 'sess-a',
      tier: 'locked',
      companySlug: 'a',
    });
  });
});

describe('resolveContextCompanyLock / agent checks', () => {
  it('stdio and CLI keep the process lock', () => {
    process.env['SUPERNAL_COMPANY_SLUG'] = 'a';
    expect(resolveContextCompanyLock({ interface: 'cli' })).toEqual({
      tier: 'locked',
      companySlug: 'a',
    });
    expect(resolveContextCompanyLock({ interface: 'mcp' })).toEqual({
      tier: 'locked',
      companySlug: 'a',
    });
    delete process.env['SUPERNAL_COMPANY_SLUG'];
    expect(resolveContextCompanyLock({ interface: 'mcp' })).toEqual({
      tier: 'platform',
      companySlug: null,
    });
  });

  it('a lock carries the company id from MODULE_COMPANY_ID or the sidecar', () => {
    const ID = '0a0a0a0a-0000-4000-8000-000000000001';
    process.env['SUPERNAL_COMPANY_SLUG'] = 'a';
    process.env['MODULE_COMPANY_ID'] = ID;
    expect(resolveContextCompanyLock({ interface: 'cli' })).toEqual({
      tier: 'locked',
      companySlug: 'a',
      companyId: ID,
    });
    delete process.env['SUPERNAL_COMPANY_SLUG'];
    expect(resolveContextCompanyLock({ interface: 'cli' })).toEqual({
      tier: 'locked',
      companySlug: null,
      companyId: ID,
    });
    delete process.env['MODULE_COMPANY_ID'];
    writeSidecar('sess-id', { tier: 'board', companySlug: 'a', companyId: ID });
    process.env['CLAUDE_CODE_SESSION_ID'] = 'sess-id';
    expect(resolveContextCompanyLock({ interface: 'cli' })).toEqual({
      tier: 'locked',
      companySlug: 'a',
      companyId: ID,
    });
  });

  it('the guard compares ids: a lock labelled by slug accepts its own id and refuses another', () => {
    const ID = '0a0a0a0a-0000-4000-8000-000000000001';
    const OTHER = '0b0b0b0b-0000-4000-8000-000000000002';
    process.env['SUPERNAL_COMPANY_SLUG'] = 'si42';
    process.env['MODULE_COMPANY_ID'] = ID;
    const guard = createSessionTenancyGuard();
    expect(guard(ID, { interface: 'cli' })).toMatchObject({ allowed: true });
    expect(guard(OTHER, { interface: 'cli' })).toMatchObject({ allowed: false });
  });

  it('EXPLOIT SUPERNAL_COMPANY_SLUG / MODULE_COMPANY_ID cannot override the session record', () => {
    const ID = '0a0a0a0a-0000-4000-8000-000000000001';
    const OTHER = '0b0b0b0b-0000-4000-8000-000000000002';
    writeSidecar('sess-rec', { tier: 'board', companySlug: 'a', companyId: ID });
    process.env['SUPERNAL_COMPANY_SLUG'] = 'victim';
    expect(resolveCompanyLockFor('sess-rec', 'victim')).toMatchObject({ tier: 'unidentified' });
    delete process.env['SUPERNAL_COMPANY_SLUG'];
    process.env['MODULE_COMPANY_ID'] = OTHER;
    expect(resolveCompanyLockFor('sess-rec', undefined)).toMatchObject({ tier: 'unidentified' });
    process.env['MODULE_COMPANY_ID'] = ID;
    expect(resolveCompanyLockFor('sess-rec', 'a')).toEqual({
      tier: 'locked',
      companySlug: 'a',
      companyId: ID,
    });
    expect(resolveCompanyLockFor('sess-rec', undefined)).toEqual({
      tier: 'locked',
      companySlug: 'a',
      companyId: ID,
    });
  });

  it('a platform record can be narrowed by the environment, never widened; a missing record ignores the environment', () => {
    writeSidecar('sess-plat', { tier: 'platform' });
    expect(resolveCompanyLockFor('sess-plat', 'a')).toMatchObject({
      tier: 'locked',
      companySlug: 'a',
    });
    expect(resolveCompanyLockFor('sess-plat', undefined)).toEqual({
      tier: 'platform',
      companySlug: null,
    });
    expect(resolveCompanyLockFor('sess-none', 'a')).toMatchObject({ tier: 'unidentified' });
  });

  it('any Claude session process counts as an agent, sidecar or not', () => {
    expect(isAgentProcess()).toBe(false);
    process.env['CLAUDE_CODE_SESSION_ID'] = 'no-sidecar';
    expect(isAgentProcess()).toBe(true);
  });

  it('every MCP call counts as an agent', () => {
    expect(isAgentContext({ interface: 'cli' })).toBe(false);
    expect(isAgentContext({ interface: 'mcp' })).toBe(true);
    expect(isAgentContext({ interface: 'mcp', transport: 'http' })).toBe(true);
  });
});
