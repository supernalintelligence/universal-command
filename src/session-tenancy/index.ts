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
 *     daemon serves every session, so its own env says nothing about the caller. An
 *     X-Supernal-Company-Slug header (callerCompanySlug) locks the call to that company; it
 *     can only add a lock to a platform/unlocked caller, never lift or change one. A header
 *     naming a different company than an existing lock (sidecar or SUPERNAL_COMPANY_SLUG) is
 *     refused outright. A request with neither header is unidentified:
 *     setUnidentifiedCallerPolicy('refuse') (the default) refuses it anything company-scoped,
 *     'platform' lets it through as platform tier and logs it (a log-only rollout).
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
  /** Set when an unidentified HTTP caller was let through by the 'platform' policy. */
  unidentified?: true;
  /** Set on an 'unidentified' lock refused for a reason other than a missing session header. */
  refusal?: string;
}

/** What an HTTP caller with no session identity gets. */
export type UnidentifiedCallerPolicy = 'platform' | 'refuse';

let unidentifiedCallerPolicy: UnidentifiedCallerPolicy = 'refuse';

/** Set the process-wide policy for unidentified HTTP callers. Call once at host startup. */
export function setUnidentifiedCallerPolicy(policy: UnidentifiedCallerPolicy): void {
  unidentifiedCallerPolicy = policy;
}

export function getUnidentifiedCallerPolicy(): UnidentifiedCallerPolicy {
  return unidentifiedCallerPolicy;
}

/** 'platform' | 'refuse' (case-insensitive), else undefined. */
export function parseUnidentifiedCallerPolicy(
  value: unknown
): UnidentifiedCallerPolicy | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim().toLowerCase();
  return v === 'platform' || v === 'refuse' ? v : undefined;
}

const COMPANY_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** True for a company slug or id safe to accept from a request header. */
export function isValidCompanySlug(slug: unknown): slug is string {
  return typeof slug === 'string' && COMPANY_SLUG_PATTERN.test(slug);
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

let companyKeyNormalizer: (company: string) => string = (c) => c;

/**
 * Canonical company key used when an X-Supernal-Company-Slug header is compared with an
 * existing lock, so a slug and its id match. createSessionTenancyGuard() installs its
 * normalizeCompany here. A throw counts as a mismatch.
 */
export function setCompanyKeyNormalizer(fn: (company: string) => string): void {
  companyKeyNormalizer = fn;
}

function sameCompany(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return companyKeyNormalizer(a) === companyKeyNormalizer(b);
  } catch {
    return false;
  }
}

/** Pick the identity source that matches how this call arrived (see the module comment). */
export function resolveContextCompanyLock(context?: Partial<ExecutionContext>): CompanyLock {
  if (context?.transport === 'http') {
    const headerCompany = context.callerCompanySlug;
    // A company header asks for a lock; a malformed one must not degrade to no lock.
    if (headerCompany !== undefined && !isValidCompanySlug(headerCompany)) {
      return { tier: 'unidentified', companySlug: null };
    }
    const spawned = process.env['SUPERNAL_COMPANY_SLUG'];
    let base: CompanyLock | null = null;
    if (spawned) base = { tier: 'locked', companySlug: spawned };
    else if (isValidSessionId(context.callerSessionId)) {
      base = resolveCompanyLockFor(context.callerSessionId, undefined);
    }
    if (!headerCompany) {
      if (base) return base;
      return unidentifiedCallerPolicy === 'platform'
        ? { tier: 'platform', companySlug: null, unidentified: true }
        : { tier: 'unidentified', companySlug: null };
    }
    // The header may only add a lock to an unlocked caller, never change an existing one.
    if (!base || base.tier !== 'locked' || !base.companySlug) {
      return { tier: 'locked', companySlug: headerCompany };
    }
    if (sameCompany(base.companySlug, headerCompany)) return base;
    return {
      tier: 'unidentified',
      companySlug: null,
      refusal:
        `Refused: X-Supernal-Company-Slug '${headerCompany}' conflicts with this session's ` +
        `lock to company '${base.companySlug}'. The header can only add a lock, never change one.`,
    };
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
export const sessionExecutionScope: ExecutionScopeFn = (context, run) => {
  const lock = resolveContextCompanyLock(context);
  noteCallerLock(lock, context);
  return runWithCompanyLock(lock, run);
};

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
  if (options.normalizeCompany) setCompanyKeyNormalizer(options.normalizeCompany);

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
          lock.refusal ??
          'Refused: this MCP HTTP request carried no X-Claude-Session-Id header (or a malformed ' +
            'X-Supernal-Company-Slug), so the caller cannot be tied to a company. Configure the ' +
            "client's headersHelper to send it.",
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

    const touched = requestedCompanySlug ?? decision.resolvedCompany;
    if (
      !decision.allowed ||
      (sessionId && firstSeen(touchSeen, `${sessionId}|${lock.tier}|${touched ?? ''}`))
    ) {
      appendSessionLog({
        event: 'company-touch',
        claudeSessionId: sessionId ?? null,
        tier: lock.tier,
        companySlug: touched ?? null,
        lockedCompanySlug: lock.companySlug,
        allowed: decision.allowed,
        reason: decision.reason,
      });
    }
    return decision;
  };
}

// What reaches session-log.ndjson: every denial, the first allowed touch of each
// (session, tier, company) per process, each change of a session's resolved lock, and
// unidentified callers at most once per UNIDENTIFIED_LOG_WINDOW_MS per caller.
const SEEN_CAP = 10_000;
const touchSeen = new Set<string>();
const lockBySession = new Map<string, string>();
const unidentifiedLastLog = new Map<string, { at: number; suppressed: number }>();
export const UNIDENTIFIED_LOG_WINDOW_MS = 60_000;

function firstSeen(set: Set<string>, key: string): boolean {
  if (set.has(key)) return false;
  if (set.size >= SEEN_CAP) set.clear();
  set.add(key);
  return true;
}

/** Test hook: forget what has been logged so far. */
export function resetSessionLogDedupe(): void {
  touchSeen.clear();
  lockBySession.clear();
  unidentifiedLastLog.clear();
}

function noteCallerLock(lock: CompanyLock, context: Partial<ExecutionContext> | undefined): void {
  if (lock.refusal) {
    appendSessionLog({
      event: 'company-header-conflict',
      claudeSessionId: context?.callerSessionId ?? null,
      tier: lock.tier,
      companySlug: context?.callerCompanySlug ?? null,
      lockedCompanySlug: null,
      allowed: false,
      reason: lock.refusal,
      tool: context?.mcpToolName ?? null,
    });
    return;
  }
  if (lock.tier === 'unidentified' || lock.unidentified) {
    const caller = context?.callerUserAgent ?? 'unknown';
    const now = Date.now();
    const prev = unidentifiedLastLog.get(caller);
    if (prev && now - prev.at < UNIDENTIFIED_LOG_WINDOW_MS) {
      prev.suppressed += 1;
      return;
    }
    if (unidentifiedLastLog.size >= SEEN_CAP) unidentifiedLastLog.clear();
    unidentifiedLastLog.set(caller, { at: now, suppressed: 0 });
    const entry = {
      event: 'unidentified-caller',
      claudeSessionId: null,
      tier: 'unidentified',
      companySlug: null,
      lockedCompanySlug: null,
      policy: unidentifiedCallerPolicy,
      allowed: unidentifiedCallerPolicy === 'platform',
      transport: context?.transport ?? null,
      tool: context?.mcpToolName ?? null,
      userAgent: caller,
      suppressedSinceLast: prev?.suppressed ?? 0,
    };
    appendSessionLog(entry);
    process.stderr.write(
      `[session-tenancy] WARN unidentified MCP HTTP caller (policy=${unidentifiedCallerPolicy}, ` +
        `tool=${entry.tool ?? '?'}, ua=${caller}, suppressed=${entry.suppressedSinceLast})\n`
    );
    return;
  }
  const sessionId =
    context?.transport === 'http' ? context.callerSessionId : process.env['CLAUDE_CODE_SESSION_ID'];
  if (!sessionId) return;
  const current = `${lock.tier}:${lock.companySlug ?? ''}`;
  const previous = lockBySession.get(sessionId);
  if (previous === current) return;
  if (lockBySession.size >= SEEN_CAP) lockBySession.clear();
  lockBySession.set(sessionId, current);
  appendSessionLog({
    event: 'tier-change',
    claudeSessionId: sessionId,
    tier: lock.tier,
    companySlug: lock.companySlug,
    lockedCompanySlug: lock.companySlug,
    previous: previous ?? null,
  });
}

/** Never throws: an audit write failure must not block the call it records. */
function appendSessionLog(fields: Record<string, unknown>): void {
  try {
    const logDir = path.join(supernalHome(), 'board-sessions');
    fs.mkdirSync(logDir, { recursive: true });
    const entry = { timestamp: new Date().toISOString(), ...fields };
    fs.appendFileSync(path.join(logDir, 'session-log.ndjson'), `${JSON.stringify(entry)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch {
    // see doc comment
  }
}
