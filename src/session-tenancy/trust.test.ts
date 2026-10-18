import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __setAgentProbeForTest,
  __setTrustedHomeForTest,
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
