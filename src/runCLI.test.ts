/**
 * Regression tests for UniversalCommand.runCLI + formatForCLI.
 *
 * These lock in the fix for the 2026-07-14 `sc git converge` SILENT-EXIT bug:
 * a raw Commander action that called `cmd.execute()` and then
 * `if (!result.success) process.exit(1)` NEVER printed the returned result's
 * message — so a failure encoded as a returned value exited non-zero with no
 * output. runCLI() must ALWAYS surface output before setting a non-zero exit.
 *
 * The tests exercise the REAL dispatch path (runCLI) and assert output reaches
 * the captured stdout/stderr AND the exit code is set — not just that the format
 * function returns a string in isolation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UniversalCommand } from './UniversalCommand';

describe('UniversalCommand.runCLI — never silently swallows output', () => {
  let stdout: string;
  let stderr: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;
  let savedExitCode: number | undefined;

  beforeEach(() => {
    stdout = '';
    stderr = '';
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    logSpy = vi.spyOn(console, 'log').mockImplementation((...a: any[]) => {
      stdout += a.map(String).join(' ') + '\n';
    });
    errSpy = vi.spyOn(console, 'error').mockImplementation((...a: any[]) => {
      stderr += a.map(String).join(' ') + '\n';
    });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    process.exitCode = savedExitCode;
  });

  const ctx = { interface: 'cli' as const };

  // The exact converge shape: failure is a RETURNED value, not a throw.
  function makeConvergeLike(result: { success: boolean; message: string }) {
    return new UniversalCommand<{ noPush?: boolean }, { success: boolean; message: string }>({
      name: 'demo converge',
      description: 'demo',
      input: { parameters: [{ name: 'noPush', type: 'boolean', default: false }] },
      output: { type: 'json' },
      handler: async () => result,
      cli: { format: (r) => `${r.success ? 'OK' : 'FAIL'} ${r.message}` },
    });
  }

  it('THE BUG: prints a returned FAILURE result and sets exit 1', async () => {
    const cmd = makeConvergeLike({ success: false, message: 'REFUSING-to-converge-BOOM' });
    const returned = await cmd.runCLI({}, ctx, { exitCode: (r) => (r.success ? 0 : 1) });

    // Message MUST reach the terminal (the pre-fix dispatch dropped it entirely).
    expect(stdout).toContain('REFUSING-to-converge-BOOM');
    expect(stdout).toContain('FAIL');
    // Exit code set to non-zero, but via process.exitCode (never process.exit).
    expect(process.exitCode).toBe(1);
    expect(returned).toEqual({ success: false, message: 'REFUSING-to-converge-BOOM' });
  });

  it('prints a returned SUCCESS result and sets exit code 0', async () => {
    const cmd = makeConvergeLike({ success: true, message: 'converged-and-pushed' });
    await cmd.runCLI({}, ctx, { exitCode: (r) => (r.success ? 0 : 1) });

    expect(stdout).toContain('converged-and-pushed');
    expect(stdout).toContain('OK');
    // Unconditional assignment (2026-07-15 review, finding #7): a success result
    // explicitly sets process.exitCode to 0 rather than merely leaving it alone,
    // so it clears any stale non-zero value a prior step in the same process may
    // have set (see the next test).
    expect(process.exitCode).toBe(0);
  });

  it('clears a STALE non-zero process.exitCode on success (finding #7)', async () => {
    process.exitCode = 9; // simulate a prior step in the same process failing
    const cmd = makeConvergeLike({ success: true, message: 'ok' });
    await cmd.runCLI({}, ctx, { exitCode: (r) => (r.success ? 0 : 1) });
    expect(process.exitCode).toBe(0);
  });

  it('prints Error: <message> to stderr and sets exit 1 when the handler THROWS', async () => {
    const cmd = new UniversalCommand({
      name: 'demo throws',
      description: 'demo',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => {
        throw new Error('KABOOM-from-handler');
      },
    });
    const returned = await cmd.runCLI({}, ctx);

    expect(stderr).toContain('KABOOM-from-handler');
    expect(process.exitCode).toBe(1);
    expect(returned).toBeUndefined();
  });

  it('honors a thrown error exit-code mapping (details.exitCode)', async () => {
    const cmd = new UniversalCommand({
      name: 'demo throws code',
      description: 'demo',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => {
        const e: any = new Error('coded');
        e.details = { exitCode: 7 };
        throw e;
      },
    });
    await cmd.runCLI({}, ctx);
    expect(process.exitCode).toBe(7);
    expect(stderr).toContain('coded');
  });

  it('never calls process.exit (would truncate piped output)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((): never => {
      throw new Error('process.exit must NOT be called by runCLI');
    }) as any);
    try {
      const cmd = makeConvergeLike({ success: false, message: 'x' });
      await expect(
        cmd.runCLI({}, ctx, { exitCode: (r) => (r.success ? 0 : 1) })
      ).resolves.toBeDefined();
    } finally {
      exitSpy.mockRestore();
    }
  });
});

describe('UniversalCommand.formatForCLI — single source of truth', () => {
  const ctx = { interface: 'cli' as const };

  it('uses cli.format when present (and passes args)', () => {
    const cmd = new UniversalCommand<{ json?: boolean }, { n: number }>({
      name: 'f a',
      description: 'd',
      input: { parameters: [{ name: 'json', type: 'boolean', default: false }] },
      output: { type: 'json' },
      handler: async () => ({ n: 1 }),
      cli: { format: (r, a) => `n=${r.n} json=${(a as any)?.json ?? false}` },
    });
    expect(cmd.formatForCLI({ n: 1 }, { json: true })).toBe('n=1 json=true');
  });

  it('falls back to JSON.stringify for output.type json', () => {
    const cmd = new UniversalCommand({
      name: 'f b',
      description: 'd',
      input: { parameters: [] },
      output: { type: 'json' },
      handler: async () => ({ ok: 1 }),
    });
    expect(cmd.formatForCLI({ ok: 1 } as any)).toBe(JSON.stringify({ ok: 1 }, null, 2));
  });

  it('runCLI + formatForCLI produce identical output for the same result', async () => {
    let captured = '';
    const spy = vi.spyOn(console, 'log').mockImplementation((...a: any[]) => {
      captured += a.map(String).join(' ') + '\n';
    });
    const saved = process.exitCode;
    process.exitCode = undefined;
    try {
      const cmd = new UniversalCommand({
        name: 'f c',
        description: 'd',
        input: { parameters: [] },
        output: { type: 'json' },
        handler: async () => ({ v: 42 }),
        cli: { format: (r) => `V=${(r as any).v}` },
      });
      await cmd.runCLI({}, ctx);
      expect(captured.trim()).toBe(cmd.formatForCLI({ v: 42 } as any));
    } finally {
      spy.mockRestore();
      process.exitCode = saved;
    }
  });
});
