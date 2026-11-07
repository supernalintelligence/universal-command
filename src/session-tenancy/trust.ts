/**
 * The trust rules for session records and agent detection that every copy of the session-tenancy
 * check must apply the same way. supernal-code-package/src/cli/utils/agent-context.ts is the sc copy
 * (it cannot import this package's Node-only entry), and the rules here mirror it:
 *
 *  - A record counts only when it is a regular file (no symlink) owned by this user that no other user
 *    can write. Anything else is absent.
 *  - SUPERNAL_HOME in an agent's own environment is ignored and an empty value is rejected.
 *  - A company pin counts only from an owner-only record in board-sessions/company-pins/<pid>.json, written by
 *    the dashboard PTY server for that PTY's child, whose pid is an ancestor of this process and whose start
 *    time matches that process's start time (so a recycled pid cannot match).
 *  - A claude/codex process among the ancestors marks an agent. An empty or failed `ps` and a chain longer
 *    than 24 levels are unknown, which counts as an agent only together with an environment marker.
 *
 * Same-uid limit: the environment and the process list belong to the user, so none of this stops a hostile
 * process of the same user. It stops accidents and the ordinary shell tricks (`env -u`, a script that sets
 * its own SUPERNAL_HOME).
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const AGENT_MARKERS = [
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_CHILD_SESSION',
  'CODEX_THREAD_ID',
  'CODEX_SESSION_ID',
  'SC_AGENT_SESSION',
];
const AGENT_COMMAND = /(^|[/\s])(claude|codex)(\s|$)|@anthropic-ai\/claude-code/;
const MAX_DEPTH = 24;
const CACHE_TTL_MS = 5000;

export function agentMarkerPresent(env: NodeJS.ProcessEnv = process.env): boolean {
  return AGENT_MARKERS.some((k) => Boolean(env[k]));
}

/** The harness session id: Claude Code sets CLAUDE_CODE_SESSION_ID, Codex sets CODEX_THREAD_ID. */
export function harnessSessionId(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    env['CLAUDE_CODE_SESSION_ID'] || env['CODEX_THREAD_ID'] || env['CODEX_SESSION_ID'] || undefined
  );
}

// ps by absolute path: a PATH entry an agent controls must not decide who started this process.
const PS_BIN = ['/bin/ps', '/usr/bin/ps'].find((f) => fs.existsSync(f)) ?? '/bin/ps';

function psOut(args: string[]): string | null {
  try {
    return execFileSync(PS_BIN, args, {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
      // A fixed locale, so a start time reads the same here and in the dashboard's pin writer.
      env: { ...process.env, LC_ALL: 'C' },
    }).trim();
  } catch {
    return null;
  }
}

export type Lineage = 'agent' | 'none' | 'unknown';

export function walkLineage(
  startPid: number = process.ppid,
  ps: (args: string[]) => string | null = psOut
): Lineage {
  if (process.platform === 'win32') return 'none';
  let pid = startPid;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (pid <= 1) return 'none';
    const out = ps(['-o', 'ppid=,command=', '-p', String(pid)]);
    if (out === null || out === '') return 'unknown';
    const m = out.match(/^(\d+)\s+(.*)$/s);
    if (!m) return 'unknown';
    if (AGENT_COMMAND.test(m[2] ?? '')) return 'agent';
    pid = Number(m[1]);
  }
  return 'unknown';
}

let cache: { at: number; value: boolean } | undefined;
let probeOverride: (() => boolean) | undefined;

/** Test hook. */
export function __setAgentProbeForTest(fn: (() => boolean) | undefined): void {
  probeOverride = fn;
  cache = undefined;
}

/** True when this process was started by an agent: a marker in the environment or an agent ancestor. */
export function processStartedByAgent(now: number = Date.now()): boolean {
  if (probeOverride) return probeOverride();
  if (cache && now >= cache.at && now - cache.at <= CACHE_TTL_MS) return cache.value;
  const value = agentMarkerPresent() || walkLineage() === 'agent';
  cache = { at: now, value };
  return value;
}

let homeOverride: string | undefined;

/** Test hook. */
export function __setTrustedHomeForTest(dir: string | undefined): void {
  homeOverride = dir;
}

/** ~/.supernal, or a non-empty SUPERNAL_HOME when no agent started this process. */
export function trustedSupernalHome(): string {
  if (homeOverride) return homeOverride;
  const env = process.env['SUPERNAL_HOME'];
  if (env && env.trim() !== '' && !processStartedByAgent()) return env;
  return path.join(os.homedir(), '.supernal'); // allow-hardpath: the SessionStart hook writes its sidecar under this root
}

export function isOwnerOnlyRegularFile(file: string): boolean {
  try {
    const st = fs.lstatSync(file);
    if (!st.isFile()) return false;
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) return false;
    return (st.mode & 0o022) === 0;
  } catch {
    return false;
  }
}

/** The session record for `sessionId`, or null when it is missing, malformed or not trustworthy. */
export function readTrustedSessionRecord<T = Record<string, unknown>>(sessionId: string): T | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)) return null;
  const file = path.join(
    trustedSupernalHome(),
    'board-sessions',
    'session-map',
    `${sessionId}.json`
  );
  if (!isOwnerOnlyRegularFile(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

/**
 * The company named by a dashboard PTY pin record for an ancestor of this process, or null. Each ancestor's
 * <home>/board-sessions/company-pins/<pid>.json counts only when it is mode 0600 or tighter, names that pid and records
 * that process's own start time. A failed `ps` or a chain longer than 24 levels is null.
 */
export function ancestorCompanyPin(
  startPid: number = process.ppid,
  ps: (args: string[]) => string | null = psOut,
  dir: string = path.join(trustedSupernalHome(), 'board-sessions', 'company-pins')
): string | null {
  if (process.platform === 'win32') return null;
  let pid = startPid;
  for (let depth = 0; depth < MAX_DEPTH && pid > 1; depth++) {
    const out = ps(['-o', 'ppid=,lstart=', '-p', String(pid)]);
    const m = out?.match(/^(\d+)\s+(.+)$/s);
    if (!m) return null;
    const file = path.join(dir, `${pid}.json`);
    if (isOwnerOnlyRegularFile(file)) {
      try {
        if ((fs.lstatSync(file).mode & 0o077) !== 0) throw new Error('readable by others');
        const rec = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
        const startedAt = (m[2] ?? '').replace(/\s+/g, ' ').trim();
        if (
          rec['pid'] === pid &&
          rec['startTime'] === startedAt &&
          typeof rec['companyId'] === 'string'
        ) {
          return rec['companyId'].toLowerCase();
        }
      } catch {
        /* unreadable record: not a pin */
      }
    }
    pid = Number(m[1]);
  }
  return null;
}
