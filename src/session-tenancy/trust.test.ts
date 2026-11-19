import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __setAgentProbeForTest,
  __setTrustedHomeForTest,
  ancestorCompanyPin,
  harnessSessionId,
  readTrustedSessionRecord,
  trustedSupernalHome,
  walkLineage,
} from './trust';

const ps = (table: Record<number, string | null>) => (args: string[]) => {
  const pid = Number(args[args.length - 1]);
  return pid in table ? table[pid]! : null;
};

describe('trusted session records', () => {
  let home: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-trust-'));
    __setTrustedHomeForTest(home);
    fs.mkdirSync(path.join(home, 'board-sessions', 'session-map'), { recursive: true });
  });
  afterEach(() => {
    __setTrustedHomeForTest(undefined);
    __setAgentProbeForTest(undefined);
    fs.rmSync(home, { recursive: true, force: true });
  });
  const rec = (id: string) => path.join(home, 'board-sessions', 'session-map', `${id}.json`);

  it('reads an owner-only regular file', () => {
    fs.writeFileSync(rec('a'), '{"tier":"platform"}', { mode: 0o600 });
    expect(readTrustedSessionRecord('a')).toEqual({ tier: 'platform' });
  });

  it('EXPLOIT a symlinked, group-writable or world-writable record is treated as absent', () => {
    fs.writeFileSync(path.join(home, 'real.json'), '{"tier":"platform"}', { mode: 0o600 });
    fs.symlinkSync(path.join(home, 'real.json'), rec('link'));
    expect(readTrustedSessionRecord('link')).toBeNull();
    fs.writeFileSync(rec('gw'), '{"tier":"platform"}');
    fs.chmodSync(rec('gw'), 0o664);
    expect(readTrustedSessionRecord('gw')).toBeNull();
    fs.writeFileSync(rec('ww'), '{"tier":"platform"}');
    fs.chmodSync(rec('ww'), 0o606);
    expect(readTrustedSessionRecord('ww')).toBeNull();
  });

  it('a session id that is not a plain token reads nothing', () => {
    expect(readTrustedSessionRecord('../x')).toBeNull();
  });

  it('EXPLOIT SUPERNAL_HOME set by an agent is ignored; an empty one is rejected', () => {
    __setTrustedHomeForTest(undefined);
    const saved = process.env['SUPERNAL_HOME'];
    try {
      process.env['SUPERNAL_HOME'] = '/tmp/agent-made';
      __setAgentProbeForTest(() => true);
      expect(trustedSupernalHome()).toBe(path.join(os.homedir(), '.supernal'));
      __setAgentProbeForTest(() => false);
      expect(trustedSupernalHome()).toBe('/tmp/agent-made');
      process.env['SUPERNAL_HOME'] = '';
      expect(trustedSupernalHome()).toBe(path.join(os.homedir(), '.supernal'));
    } finally {
      if (saved === undefined) delete process.env['SUPERNAL_HOME'];
      else process.env['SUPERNAL_HOME'] = saved;
    }
  });

  it('Codex uses CODEX_THREAD_ID', () => {
    expect(harnessSessionId({ CODEX_THREAD_ID: 't1' })).toBe('t1');
    expect(harnessSessionId({ CLAUDE_CODE_SESSION_ID: 'c1', CODEX_THREAD_ID: 't1' })).toBe('c1');
  });

  it('lineage: empty ps, failed ps and a chain over 24 levels are unknown, not agent', () => {
    expect(walkLineage(5, ps({ 5: '4 node /x/claude', 4: '1 init' }))).toBe('agent');
    expect(walkLineage(5, ps({ 5: '' }))).toBe('unknown');
    expect(walkLineage(5, ps({}))).toBe('unknown');
    const long: Record<number, string> = {};
    for (let i = 2; i < 40; i++) long[i] = `${i + 1} zsh`;
    expect(walkLineage(2, ps(long))).toBe('unknown');
  });
});

describe('ancestorCompanyPin', () => {
  const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const START = 'Sat Nov 7 11:22:33 2026';
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uc-pin-'));
    fs.chmodSync(dir, 0o700);
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const pin = (pid: number, rec: Record<string, unknown>, mode = 0o600) => {
    const f = path.join(dir, `${pid}.json`);
    fs.writeFileSync(f, JSON.stringify(rec), { mode });
    fs.chmodSync(f, mode);
  };
  // caller 30 -> 20 (the PTY child) -> 10 -> 1
  const chain = ps({ 30: `20 ${START}`, 20: `10 Sat Nov  7 11:22:33 2026`, 10: `1 ${START}` });

  it('an owner-only record of an ancestor with the same start time names its company', () => {
    pin(20, { pid: 20, companyId: A, startTime: START });
    expect(ancestorCompanyPin(30, chain, dir)).toBe(A);
  });

  it('the real ps start time of the real parent process matches', () => {
    const out = execFileSync('/bin/ps', ['-o', 'lstart=', '-p', String(process.ppid)], {
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C' },
    });
    pin(process.ppid, {
      pid: process.ppid,
      companyId: A,
      startTime: out.replace(/\s+/g, ' ').trim(),
    });
    expect(ancestorCompanyPin(process.ppid, undefined, dir)).toBe(A);
  });

  it('EXPLOIT no record is no pin', () => {
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
  });

  it('EXPLOIT a record any other user can read or write (0644, 0666) is no pin', () => {
    pin(20, { pid: 20, companyId: A, startTime: START }, 0o644);
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
    pin(20, { pid: 20, companyId: A, startTime: START }, 0o666);
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
  });

  it('EXPLOIT a recycled pid (start time differs) is no pin', () => {
    pin(20, { pid: 20, companyId: A, startTime: 'Fri Nov 6 09:00:00 2026' });
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
  });

  it('EXPLOIT a record for a process that is not an ancestor is no pin', () => {
    pin(99, { pid: 99, companyId: A, startTime: START });
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
  });

  it('EXPLOIT a record naming another pid is no pin', () => {
    pin(20, { pid: 21, companyId: A, startTime: START });
    expect(ancestorCompanyPin(30, chain, dir)).toBeNull();
  });

  it('EXPLOIT a failed or empty ps is no pin', () => {
    pin(20, { pid: 20, companyId: A, startTime: START });
    expect(ancestorCompanyPin(30, ps({}), dir)).toBeNull();
    expect(ancestorCompanyPin(30, ps({ 30: '' }), dir)).toBeNull();
    expect(ancestorCompanyPin(30, ps({ 30: `20 ${START}` }), dir)).toBeNull();
  });
});
