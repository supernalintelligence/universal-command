/**
 * Session-to-company tenancy resolution (REQ-STC-101/102), Node-only.
 *
 * Shared home for the logic that supernal-code-package/src/cli/utils/session-tenancy-guard.ts
 * and packages/modules/lib/session-tenancy-guard.ts carry as copies. Kept out of the main
 * barrel because it uses node:fs and node:async_hooks.
 *
 * This entry is bundled on its own (tsup, no splitting), so it must not import runtime
 * values from the main entry: a second copy of UniversalCommand's module state would mean
 * setTenancyGuard() registered on the wrong singleton. Hosts wire it up themselves:
 *
 *   setTenancyGuard(createSessionTenancyGuard());
 *   setExecutionScope(sessionExecutionScope);
 *
 * Resolution (resolveCompanyLockFor):
 *   1. SUPERNAL_COMPANY_SLUG: an automated spawn, always locked to that company.
 *   2. <SUPERNAL_HOME>/board-sessions/session-map/<sessionId>.json, the sidecar the
 *      SessionStart hook writes for a board/department/director session.
 *   3. Neither: platform tier (unrestricted).
 *
 * Which session id applies depends on the caller (resolveContextCompanyLock):
 *   - CLI and MCP over stdio: the process env (CLAUDE_CODE_SESSION_ID).
 *   - API (dashboard): ExecutionContext.sessionId from the x-session-id header.
 *   - MCP over HTTP: ExecutionContext.callerSessionId from X-Claude-Session-Id. One
 *     daemon serves every session, so its own env says nothing about the caller. A request
 *     with no valid header is 'unidentified' and refused anything company-scoped.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ExecutionContext } from '../types';
import type { TenancyDecision, TenancyGuardFn, ExecutionScopeFn } from '../UniversalCommand';

/**
 * 'locked': exactly one company. 'platform': unrestricted operator.
 * 'unidentified': an HTTP caller that sent no session identity; refused anything
 * company-scoped and never routed to a shared/global store.
 */
export type CompanyLockTier = 'locked' | 'platform' | 'unidentified';

export interface CompanyLock {
  tier: CompanyLockTier;
  companySlug: string | null;
}

interface SessionMapEntry {
  tier?: string;
  companySlug?: string | null;
}

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/** True for a session id safe to use as a file name (no path separators or dots). */
export function isValidSessionId(sessionId: unknown): sessionId is string {
  return typeof sessionId === 'string' && SESSION_ID_PATTERN.test(sessionId);
}

function supernalHome(): string {
  return process.env['SUPERNAL_HOME'] ?? path.join(os.homedir(), '.supernal'); // allow-hardpath: the SessionStart hook writes its sidecar under this root
}

function readSessionMapEntry(sessionId: string): SessionMapEntry | null {
  if (!isValidSessionId(sessionId)) return null;
  try {
    const raw = fs.readFileSync(
      path.join(supernalHome(), 'board-sessions', 'session-map', `${sessionId}.json`),
      'utf8'
    );
    return JSON.parse(raw) as SessionMapEntry;
  } catch {
    return null;
  }
}

export function resolveCompanyLockFor(
  sessionId: string | undefined,
  spawnedCompanySlug: string | undefined
): CompanyLock {
  if (spawnedCompanySlug) return { tier: 'locked', companySlug: spawnedCompanySlug };
  if (!sessionId) return { tier: 'platform', companySlug: null };
  const entry = readSessionMapEntry(sessionId);
  if (!entry || entry.tier === 'platform' || !entry.companySlug) {
    return { tier: 'platform', companySlug: null };
  }
  return { tier: 'locked', companySlug: entry.companySlug };
}

/** CLI / stdio MCP: one process is one session for its whole life. */
export function resolveProcessCompanyLock(): CompanyLock {
  return resolveCompanyLockFor(
    process.env['CLAUDE_CODE_SESSION_ID'],
    process.env['SUPERNAL_COMPANY_SLUG']
  );
}

/** Dashboard API: identity comes from the request, SUPERNAL_COMPANY_SLUG still applies process-wide. */
export function resolveRequestCompanyLock(sessionId: string | undefined): CompanyLock {
  return resolveCompanyLockFor(sessionId, process.env['SUPERNAL_COMPANY_SLUG']);
}

/** Pick the identity source that matches how this call arrived (see the module comment). */
export function resolveContextCompanyLock(context?: Partial<ExecutionContext>): CompanyLock {
  if (context?.transport === 'http') {
    const spawned = process.env['SUPERNAL_COMPANY_SLUG'];
    if (spawned) return { tier: 'locked', companySlug: spawned };
    if (!isValidSessionId(context.callerSessionId)) {
      return { tier: 'unidentified', companySlug: null };
    }
    return resolveCompanyLockFor(context.callerSessionId, undefined);
  }
  if (context?.interface === 'api') return resolveRequestCompanyLock(context.sessionId);
  return resolveProcessCompanyLock();
}

const lockStore = new AsyncLocalStorage<CompanyLock>();

/** Run `fn` with `lock` as the current company lock for everything it awaits. */
export function runWithCompanyLock<T>(lock: CompanyLock, fn: () => T): T {
  return lockStore.run(lock, fn);
}

/** The lock bound by the current execution scope, or undefined outside one. */
export function scopedCompanyLock(): CompanyLock | undefined {
  return lockStore.getStore();
}

/** The scoped lock if a command is executing, else this process's own lock. */
export function currentCompanyLock(): CompanyLock {
  return lockStore.getStore() ?? resolveProcessCompanyLock();
}

/** ExecutionScopeFn for setExecutionScope(): binds the caller's lock for the whole execute(). */
export const sessionExecutionScope: ExecutionScopeFn = (context, run) =>
  runWithCompanyLock(resolveContextCompanyLock(context), run);

/**
 * True when this PROCESS runs on behalf of an agent: an automated spawn
 * (SUPERNAL_COMPANY_SLUG) or anything started inside a Claude Code session
 * (CLAUDE_CODE_SESSION_ID, sidecar or not). Only a bare human shell is false.
 */
export function isAgentProcess(): boolean {
  return Boolean(process.env['SUPERNAL_COMPANY_SLUG'] || process.env['CLAUDE_CODE_SESSION_ID']);
}

/**
 * True when this CALL comes from an agent. Every MCP call does (stdio or HTTP: the
 * client is an AI tool, and Claude Code strips CLAUDE_CODE_SESSION_ID from stdio server
 * env, so the process check alone would miss it). Other surfaces fall back to
 * isAgentProcess().
 */
export function isAgentContext(context?: Partial<ExecutionContext>): boolean {
  if (context?.interface === 'mcp' || context?.transport === 'http') return true;
  return isAgentProcess();
}

export interface SessionTenancyGuardOptions {
  /**
   * Map a company reference (slug or id) to one canonical key before comparing, so
   * a slug and its id match. Throwing means "unresolvable" and the call is refused.
   */
  normalizeCompany?: (company: string) => string;
}

/** Build the TenancyGuardFn to pass to setTenancyGuard(). */
export function createSessionTenancyGuard(
  options: SessionTenancyGuardOptions = {}
): TenancyGuardFn {
  const normalize = options.normalizeCompany ?? ((c: string) => c);

  return (requestedCompanySlug, context) => {
    const lock = scopedCompanyLock() ?? resolveContextCompanyLock(context);
    const sessionId =
      context?.transport === 'http'
        ? context.callerSessionId
        : process.env['CLAUDE_CODE_SESSION_ID'];

    let decision: TenancyDecision;
    if (lock.tier === 'unidentified') {
      decision = {
        allowed: false,
        reason:
          'Refused: this MCP HTTP request carried no X-Claude-Session-Id header, so the ' +
          'caller cannot be tied to a company. Configure the client to send it.',
      };
    } else if (!requestedCompanySlug) {
      decision =
        lock.tier === 'locked' && lock.companySlug
          ? { allowed: true, resolvedCompany: lock.companySlug }
          : { allowed: true };
    } else if (lock.tier === 'platform') {
      decision = { allowed: true };
    } else {
      let same = false;
      try {
        same = normalize(lock.companySlug as string) === normalize(requestedCompanySlug);
      } catch {
        same = false;
      }
      decision = same
        ? { allowed: true }
        : {
            allowed: false,
            reason: `Session is locked to company '${lock.companySlug}' and may not act on company '${requestedCompanySlug}'.`,
          };
    }

    recordCompanyTouch(lock, sessionId, requestedCompanySlug ?? decision.resolvedCompany, decision);
    return decision;
  };
}

/** Never throws: an audit write failure must not block the check it records. */
function recordCompanyTouch(
  lock: CompanyLock,
  claudeSessionId: string | undefined,
  companySlug: string | undefined,
  decision: TenancyDecision
): void {
  if (!claudeSessionId && decision.allowed) return;
  try {
    const logDir = path.join(supernalHome(), 'board-sessions');
    fs.mkdirSync(logDir, { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      event: 'company-touch',
      claudeSessionId: claudeSessionId ?? null,
      tier: lock.tier,
      companySlug: companySlug ?? null,
      lockedCompanySlug: lock.companySlug,
      allowed: decision.allowed,
      reason: decision.reason,
    };
    fs.appendFileSync(path.join(logDir, 'session-log.ndjson'), `${JSON.stringify(entry)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch {
    // see doc comment
  }
}
